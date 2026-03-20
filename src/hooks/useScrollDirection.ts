import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);
  
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const isAtTopRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const pivotYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    pivotYRef.current = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      
      // Hysteresis for isAtTop to prevent bouncing when header height changes
      let currentIsAtTop = isAtTopRef.current;
      if (currentIsAtTop && scrollY > 120) {
        currentIsAtTop = false;
      } else if (!currentIsAtTop && scrollY < 20) {
        currentIsAtTop = true;
      }

      if (currentIsAtTop !== isAtTopRef.current) {
        isAtTopRef.current = currentIsAtTop;
        setIsAtTop(currentIsAtTop);
      }

      // Direction logic with threshold
      if (scrollY > lastScrollYRef.current) {
        // Moving down
        if (scrollDirectionRef.current !== 'down' && scrollY - pivotYRef.current > 40) {
          scrollDirectionRef.current = 'down';
          setScrollDirection('down');
        }
        if (scrollDirectionRef.current === 'down') {
           pivotYRef.current = scrollY;
        }
      } else if (scrollY < lastScrollYRef.current) {
        // Moving up
        if (scrollDirectionRef.current !== 'up' && pivotYRef.current - scrollY > 40) {
          scrollDirectionRef.current = 'up';
          setScrollDirection('up');
        }
        if (scrollDirectionRef.current === 'up') {
           pivotYRef.current = scrollY;
        }
      }

      lastScrollYRef.current = scrollY > 0 ? scrollY : 0;
    };

    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, []);

  return { scrollDirection, isAtTop };
}
