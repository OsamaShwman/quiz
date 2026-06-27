import React, { useEffect, useRef } from 'react';

// Tells TypeScript about the global katex from CDN
declare global {
  interface Window {
    katex?: {
      render: (tex: string, element: HTMLElement, options?: { displayMode?: boolean; throwOnError?: boolean }) => void;
    };
  }
}

// Common LaTeX commands that lose their leading "\" when the AI forgets
// to double-escape backslashes in JSON output. Order matters: longer
// matches first so "leftrightarrow" is repaired before "left".
const LATEX_COMMANDS = [
  'leftrightarrow', 'longrightarrow', 'longleftarrow', 'rightarrow',
  'leftarrow', 'Rightarrow', 'Leftarrow', 'Leftrightarrow',
  'overline', 'underline', 'overrightarrow', 'overleftarrow',
  'mathbb', 'mathbf', 'mathit', 'mathrm', 'mathcal', 'mathfrak',
  'displaystyle', 'scriptstyle', 'scriptscriptstyle',
  'frac', 'sqrt', 'cdot', 'times', 'div', 'pm', 'mp',
  'infty', 'partial', 'nabla', 'forall', 'exists',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma',
  'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
  'Upsilon', 'Phi', 'Psi', 'Omega',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'propto',
  'subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin',
  'cup', 'cap', 'setminus', 'emptyset',
  'sum', 'prod', 'int', 'oint', 'lim', 'log', 'ln', 'sin', 'cos', 'tan',
  'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'text', 'mbox',
];
const LATEX_REPAIR_RE = new RegExp(
  // Negative lookbehind: only match commands NOT already preceded by a backslash.
  // We require the command to be followed by a non-letter (so "text" matches but "texture" doesn't).
  '(?<!\\\\)\\b(' + LATEX_COMMANDS.join('|') + ')(?=[^a-zA-Z]|$)',
  'g'
);

// Markers that strongly indicate a corrupted LaTeX expression hidden inside
// the text without proper delimiters. If any of these appear, we know there's
// math here and we should try to repair + wrap it.
const CORRUPTION_MARKERS = /(?:ext\{|ightarrow|eftarrow|ightleftarrow|rac\{|sqrt\{|cdot|infty)/;

// A "math chunk" is a substring we will repair and wrap in $$. We detect it
// by finding the smallest enclosing parentheses around a corruption marker,
// OR by greedily expanding from the marker through math-like characters.
function repairOneChunk(chunk: string): string {
  return chunk
    // The most common: chemistry/text labels
    .replace(/(?<![a-zA-Z\\])ext\{/g, '\\text{')
    .replace(/(?<![a-zA-Z\\])ightleftarrow\b/g, '\\rightleftarrow')
    .replace(/(?<![a-zA-Z\\])ightarrow\b/g, '\\rightarrow')
    .replace(/(?<![a-zA-Z\\])eftarrow\b/g, '\\leftarrow')
    .replace(/(?<![a-zA-Z\\])imes\b/g, '\\times')
    .replace(/(?<![a-zA-Z\\])rac\{/g, '\\frac{')
    .replace(/(?<![a-zA-Z\\])qrt\{/g, '\\sqrt{')
    .replace(/(?<![a-zA-Z\\])dot\b/g, '\\cdot')
    .replace(/(?<![a-zA-Z\\])nfty\b/g, '\\infty')
    // Generic: anything else from the known commands list
    .replace(LATEX_REPAIR_RE, '\\$1');
}

function repairLatex(input: string): string {
  if (!input) return input;
  let out = input;

  // Step 1: Repair any LaTeX commands already inside $$...$$ regions.
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => `$$${repairOneChunk(inner)}$$`);

  // Step 2: Find parenthesized expressions that contain corruption markers.
  // The original AI output likely had \(...\) which got reduced to (...) by
  // the JSON-escape stripping. Convert these to $$...$$ math.
  out = out.replace(/\(([^()\n]{1,300})\)/g, (match, inner) => {
    if (!CORRUPTION_MARKERS.test(inner)) return match;
    const fixed = repairOneChunk(inner.trim());
    return `$$${fixed}$$`;
  });

  // Step 3: Catch standalone bare corruption markers that aren't inside parens.
  // We expand from each marker through math-like characters (letters, digits,
  // braces, ^, _, +, -, =, /, \) until we hit something that doesn't belong.
  // This handles cases where even the parens got stripped.
  const bareRe = /(?<![\\$\w])((?:ext\{|ightarrow|eftarrow|ightleftarrow|rac\{|sqrt\{|infty)[^\s,،.;؟?!()$\n]*)/g;
  out = out.replace(bareRe, (_m, chunk) => `$$${repairOneChunk(chunk)}$$`);

  // Step 4: Final pass — repair any remaining bare patterns globally
  // (in case they're embedded in already-wrapped sections we didn't catch)
  out = out
    .replace(/(?<![a-zA-Z\\$])ext\{/g, '\\text{')
    .replace(/(?<![a-zA-Z\\$])ightarrow\b/g, '\\rightarrow');

  return out;
}

interface MathTextProps {
  children: string | undefined | null;
  className?: string;
  block?: boolean; // wrap in <div> instead of <span>
  /** When true, sets dir="auto" so the browser detects direction from the first strong character */
  autoDir?: boolean;
}

/**
 * Renders text that may contain inline `$...$` or display `$$...$$` LaTeX.
 * Falls back to plain text if KaTeX is not loaded yet.
 */
export const MathText: React.FC<MathTextProps> = ({ children, className, block = false, autoDir = true }) => {
  const ref = useRef<HTMLSpanElement | HTMLDivElement>(null);
  const text = children ?? '';

  // Repair common JSON-escape damage where the AI forgot to double its
  // backslashes. Without this, "\text{H}" becomes "<TAB>ext{H}" after JSON
  // parsing and the math is unreadable. We detect known LaTeX command
  // fragments missing their leading backslash and re-add it.
  // This is a best-effort safety net; the prompt also tells the AI to
  // double-escape, but this catches the cases where it slips up.
  const repaired = repairLatex(text);

  // Split into segments: text | inline math | display math
  // Supported delimiters:
  //   $$...$$   - both inline and display math (single delimiter, JSON-safe)
  //   \(...\)   - inline math (legacy, kept for backwards compat)
  //   \[...\]   - display math (legacy, kept for backwards compat)
  // Single $..$ is intentionally NOT supported (conflicts with currency).
  const segments: { type: 'text' | 'inline' | 'display'; value: string }[] = [];
  let remaining = repaired;
  const re = /(\$\$([\s\S]+?)\$\$)|(\\\(([\s\S]+?)\\\))|(\\\[([\s\S]+?)\\\])/;
  while (remaining.length > 0) {
    const match = re.exec(remaining);
    if (!match) {
      segments.push({ type: 'text', value: remaining });
      break;
    }
    if (match.index > 0) {
      segments.push({ type: 'text', value: remaining.slice(0, match.index) });
    }
    if (match[1]) {
      // $$...$$  →  treat as inline (most quiz math is short)
      segments.push({ type: 'inline', value: match[2] });
    } else if (match[3]) {
      segments.push({ type: 'inline', value: match[4] });
    } else if (match[5]) {
      segments.push({ type: 'display', value: match[6] });
    }
    remaining = remaining.slice(match.index + match[0].length);
  }

  useEffect(() => {
    if (!ref.current || !window.katex) return;
    const mathSpans = ref.current.querySelectorAll<HTMLElement>('[data-math]');
    mathSpans.forEach(el => {
      const tex = el.getAttribute('data-math') || '';
      const displayMode = el.getAttribute('data-display') === 'true';
      try {
        window.katex!.render(tex, el, { displayMode, throwOnError: false });
      } catch {
        el.textContent = displayMode ? `$$${tex}$$` : `$${tex}$`;
      }
    });
  }, [text]);

  const Tag = block ? 'div' : 'span';

  return (
    <Tag ref={ref as any} className={className} dir={autoDir ? 'auto' : undefined} style={{ unicodeBidi: 'plaintext' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <React.Fragment key={i}>{seg.value}</React.Fragment>;
        return (
          <span
            key={i}
            data-math={seg.value}
            data-display={seg.type === 'display' ? 'true' : 'false'}
          >
            {seg.type === 'display' ? `$$${seg.value}$$` : `$${seg.value}$`}
          </span>
        );
      })}
    </Tag>
  );
};
