'use client';

import { useState, useEffect } from 'react';

export type Step = 'info' | 'route' | 'arrival' | 'settlement';

const STORAGE_KEY = `${process.env.NEXT_PUBLIC_HOSTEL_NAME}_checkin_complete`;

export function useCheckInState(isOnsite: boolean) {
  const [currentStep, setCurrentStep] = useState<Step>(isOnsite ? 'arrival' : 'info');
  const [isCheckinComplete, setIsCheckinComplete] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    const complete = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsCheckinComplete(complete);
    setIsMounted(true);
  }, []);

  const handleCheckinComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsCheckinComplete(true);
  };

  return {
    currentStep,
    setCurrentStep,
    isCheckinComplete,
    isMounted,
    handleCheckinComplete,
  };
}
