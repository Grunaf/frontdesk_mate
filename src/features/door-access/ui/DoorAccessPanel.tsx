'use client';

import { useNightMode } from '@/shared/lib';
import { HOSTEL_CONFIG } from '@/shared/config';
import { ArrivalGuideBanner } from './ArrivalGuideBanner';
import { ArrivalVisuals } from './ArrivalVisuals';

export function DoorAccessPanel() {
  const isNightMode = useNightMode();

  return (
    <div className="space-y-6 pt-5">
      <ArrivalGuideBanner
        isNightMode={isNightMode}
        checkInTime={HOSTEL_CONFIG.selfCheckInTimeAfter ?? ''}
      />
      <ArrivalVisuals />
    </div>
  );
}
