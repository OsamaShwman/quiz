import React, { useEffect, useState, useRef } from 'react';

interface TimerBarProps {
  duration: number; // seconds
  onTimeUp: () => void;
  isActive: boolean;
  resetKey: number; // change this to reset the timer
}

export const TimerBar: React.FC<TimerBarProps> = ({ duration, onTimeUp, isActive, resetKey }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(duration);
  }, [resetKey, duration]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, resetKey]);

  const percentage = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 5;

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm font-medium ${isLow ? 'text-[#ef4444]' : 'text-[#6882a9]'}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="w-full h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${isLow ? 'bg-[#ef4444]' : timeLeft <= 10 ? 'bg-[#f59e0b]' : 'bg-[#08b8fb]'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
