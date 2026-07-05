'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/entities/tenant';

export type Step = 'info' | 'route' | 'arrival';

export function useCheckInState(isOnsite: boolean) {
  const { slug } = useTenant();
  const storageKey = `${slug}_checkin_complete`;

  const [currentStep, setCurrentStep] = useState<Step>(isOnsite ? 'arrival' : 'info');
  const [isCheckinComplete, setIsCheckinComplete] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    const complete = localStorage.getItem(storageKey) === 'true';
    setIsCheckinComplete(complete);
    setIsMounted(true);
  }, [storageKey]);

  const handleCheckinComplete = () => {
    localStorage.setItem(storageKey, 'true');
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
