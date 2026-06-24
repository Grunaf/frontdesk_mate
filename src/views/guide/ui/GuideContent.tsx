'use client';

import { LocalGuide } from '@/features/welcome';
import { FeatureGate } from '@/shared/ui';

export function GuideContent() {
  return (
    <div className="px-4 py-6">
      <FeatureGate module="localGuide">
        <LocalGuide variant="full" />
      </FeatureGate>
    </div>
  );
}
