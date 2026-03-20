import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const isAtTopRef = useRef(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirectionRef.current && (scrollY - lastScrollY > 50 || scrollY - lastScrollY < -50)) {
        scrollDirectionRef.current = direction;
        setScrollDirection(direction);
      }
      
      const currentIsAtTop = scrollY < 50;
      if (currentIsAtTop !== isAtTopRef.current) {
        isAtTopRef.current = currentIsAtTop;
        setIsAtTop(currentIsAtTop);
      }
      
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };

    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, []);

  return { scrollDirection, isAtTop };
}
