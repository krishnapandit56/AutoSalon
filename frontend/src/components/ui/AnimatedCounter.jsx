import { useEffect, useRef, useState } from 'react';

export function useAnimatedCounter(target, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setValue(Number(current.toFixed(decimals)));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
      }
    };

    requestAnimationFrame(step);
  }, [target, duration, decimals]);

  return value;
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) {
  const animated = useAnimatedCounter(value, duration, decimals);

  return (
    <span className={className}>
      {prefix}{animated.toLocaleString()}{suffix}
    </span>
  );
}
