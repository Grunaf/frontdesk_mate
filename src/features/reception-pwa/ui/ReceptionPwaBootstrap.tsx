'use client';

import { useEffect } from 'react';
import { registerReceptionServiceWorker } from '../lib/receptionPwaClient';

export function ReceptionPwaBootstrap() {
  useEffect(() => {
    void registerReceptionServiceWorker();
  }, []);

  return null;
}
