import { cn } from '@/shared/lib/utils';
import {
  EXTERNAL_SERVICE_ICONS,
  type ExternalServiceId,
} from '@/shared/config/external-services';

interface ExternalServiceIconProps {
  service: ExternalServiceId;
  className?: string;
}

const SERVICE_ICON_CLASS: Record<ExternalServiceId, string> = {
  whatsapp: 'text-service-whatsapp',
  instagram: '',
  facebook: '',
};

export function ExternalServiceIcon({ service, className }: ExternalServiceIconProps) {
  const Icon = EXTERNAL_SERVICE_ICONS[service];

  return (
    <Icon
      data-slot="service-icon"
      className={cn('size-4 shrink-0', SERVICE_ICON_CLASS[service], className)}
      aria-hidden="true"
    />
  );
}
