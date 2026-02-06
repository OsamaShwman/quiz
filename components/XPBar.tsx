import React, { useEffect, useState } from 'react';
import { getXPForCurrentLevel, getLevelFromXP } from '../utils/gamification';
import { useAppStore } from '../store';
import { Icons, TOKENS } from '../constants';

interface XPBarProps {
  totalXP: number;
  level: number;
  showLevelUp: boolean;
}

export const XPBar: React.FC<XPBarProps> = ({ totalXP, level, showLevelUp }) => {
  const { t } = useAppStore();
  const { current, needed, progress } = getXPForCurrentLevel(totalXP);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="relative">
      {/* Level-up overlay */}
      {showLevelUp && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 animate-[bounce_0.6s_ease-out]">
          <div className="bg-[#f59e0b] text-white px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-2">
            <Icons.Zap />
            {t('levelUp')}!
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Level badge */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          showLevelUp ? 'bg-[#f59e0b] text-white animate-[pulse_0.5s_ease-in-out_3]' : 'bg-[#ed3b91]/10 text-[#ed3b91]'
        }`}>
          {level}
        </div>

        {/* XP bar */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className={`${TOKENS.typography.sm} text-[#6882a9]`}>
              {t('level')} {level}
            </span>
            <span className={`${TOKENS.typography.sm} text-[#6882a9]`}>
              {current}/{needed} XP
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${displayProgress}%`,
                background: showLevelUp
                  ? 'linear-gradient(90deg, #f59e0b, #ed3b91)'
                  : 'linear-gradient(90deg, #ed3b91, #08b8fb)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
