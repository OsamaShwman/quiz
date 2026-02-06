import React from 'react';
import { Icons } from '../constants';

interface StarRatingProps {
  stars: number; // 0-3
  animate?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ stars, animate = false, size = 24 }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(i => (
        <span
          key={i}
          className={`${i <= stars ? 'text-[#f59e0b]' : 'text-[#e2e8f0]'} ${
            animate && i <= stars ? 'animate-[bounce_0.5s_ease-out]' : ''
          }`}
          style={animate && i <= stars ? { animationDelay: `${(i - 1) * 150}ms`, animationFillMode: 'both' } : undefined}
        >
          <Icons.Star filled={i <= stars} size={size} />
        </span>
      ))}
    </div>
  );
};
