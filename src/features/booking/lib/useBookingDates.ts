'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useBookingDates() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';

  const setDate = (type: 'checkIn' | 'checkOut', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(type, value);
    else params.delete(type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return { checkIn, checkOut, setDate };
}
