'use client';

import { FAQAccordion } from '@/features/faq';
import { FeatureGate } from '@/shared/ui';

export function FaqContent() {
  return (
    <div className="px-4 py-6">
      <FeatureGate module="faq">
        <FAQAccordion variant="full" />
      </FeatureGate>
    </div>
  );
}
