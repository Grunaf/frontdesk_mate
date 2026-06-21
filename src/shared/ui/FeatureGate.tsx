'use client';

import { useTranslations } from '@/shared/i18n';
import type { AppModule } from '@/entities/tenant/model/capabilities';
import { useModuleStatus } from '@/entities/tenant';
import { Badge } from './badge';

interface FeatureGateProps {
  module: AppModule;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPreviewBadge?: boolean;
}

export function FeatureGate({
  module,
  children,
  fallback = null,
  showPreviewBadge = true,
}: FeatureGateProps) {
  const status = useModuleStatus(module);
  const t = useTranslations('components.featureGate');

  if (status === 'hidden') {
    return <>{fallback}</>;
  }

  if (status === 'preview' && showPreviewBadge) {
    return (
      <div className="space-y-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          {t('previewBadge')}
        </Badge>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
