import { useState, useCallback } from 'react';

interface TouchFeedbackOptions {
  activeClass?: string;
  duration?: number;
}

export function useTouchFeedback(options: TouchFeedbackOptions = {}) {
  const [isTouched, setIsTouched] = useState(false);
  const {
    activeClass = 'bg-opacity-10',
    duration = 150
  } = options;

  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Add a small delay before removing the touch state
    setTimeout(() => {
      setIsTouched(false);
    }, duration);
  }, [duration]);

  const touchProps = {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
    className: isTouched ? activeClass : ''
  };

  return { isTouched, touchProps };
} 