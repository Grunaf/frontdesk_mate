'use client';

import type { LucideIcon } from 'lucide-react';
import { ConciergeBell, LogOut, MessageCircle, Moon, Wifi } from 'lucide-react';
import { useTranslations } from '@/shared/i18n';
import { Icon, PressableTileButton } from '@/shared/ui';
import { resolveStayEssentialBridgeTint } from '../lib/resolveStayEssentialBridgeTint';
import type { StayEssentialBridgeId } from '../model/types';
import { stayEssentialsTileClassName } from './stayEssentialsTileClassName';

const BRIDGE_ICONS: Record<StayEssentialBridgeId, LucideIcon> = {
  wifi: Wifi,
  checkout: LogOut,
  nightAccess: Moon,
  reception: ConciergeBell,
  contact: MessageCircle,
};

interface StayEssentialsBridgeCardProps {
  bridgeId: StayEssentialBridgeId;
  isRead: boolean;
  onOpen: () => void;
}

export function StayEssentialsBridgeCard({ bridgeId, isRead, onOpen }: StayEssentialsBridgeCardProps) {
  const t = useTranslations('components.stayEssentials');
  const accentColor = resolveStayEssentialBridgeTint(bridgeId);
  const { className, style } = stayEssentialsTileClassName({ isRead, accentColor });
  const title = t(`bridges.${bridgeId}`);
  const ariaLabel = isRead
    ? t('bridgeAriaLabelRead', { title })
    : t('bridgeAriaLabelUnread', { title });

  return (
    <PressableTileButton
      onClick={onOpen}
      className={className}
      style={style}
      aria-label={ariaLabel}
      data-testid={`stay-bridge-${bridgeId}`}
      data-read={isRead ? 'read' : 'unread'}
    >
      <span
        aria-hidden="true"
        data-testid={`stay-bridge-${bridgeId}-indicator-${isRead ? 'read' : 'unread'}`}
        className="sr-only"
      />

      <span className="absolute top-2.5 right-2.5 left-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {title}
      </span>

      <div className="absolute bottom-2 left-2 text-muted-foreground">
        <Icon icon={BRIDGE_ICONS[bridgeId]} className="h-7 w-7" />
      </div>
    </PressableTileButton>
  );
}
