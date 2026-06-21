// src/features/booking/ui/BookingLayoutWrapper.tsx
'use client';

import { useIntersectionObserver } from '../lib/useIntersectionObserver';
import { DateWidget } from './DateWidget';

interface BookingLayoutWrapperProps {
  children: React.ReactNode;
}

export function BookingLayoutWrapper({ children }: BookingLayoutWrapperProps) {
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0,
    rootMargin: '-80px 0px 0px 0px',
  });

  return (
    <>
      <DateWidget isVisible={!isIntersecting} />
      <div ref={targetRef as React.RefObject<HTMLDivElement>}>{children}</div>
    </>
  );
}
