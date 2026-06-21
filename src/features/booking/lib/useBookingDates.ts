'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useBookingDates() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checkIn = searchParams.get('checkin') || searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkout') || searchParams.get('checkOut') || '';

  const setDate = (type: 'checkIn' | 'checkOut', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkIn');
    params.delete('checkOut');
    const key = type === 'checkIn' ? 'checkin' : 'checkout';
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return { checkIn, checkOut, setDate };
}
