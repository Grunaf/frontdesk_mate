'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

const doorAccessSheetFixedClass =
  'pointer-events-auto fixed bottom-0 left-1/2 z-30 w-full max-w-md min-w-0 -translate-x-1/2 pb-[env(safe-area-inset-bottom,0px)]';

const DEFAULT_SHEET_OVERLAP_PX = 12;

export interface DoorAccessStageLayoutProps {
  media: ReactNode;
  sheet: ReactNode;
  mediaOverlay?: ReactNode;
  /** Overlay on top of the photo (e.g. guide chips). */
  mediaTopOverlay?: ReactNode;
  /** Content above the media viewport (legacy; prefer `mediaTopOverlay`). */
  aboveMedia?: ReactNode;
  belowMedia?: ReactNode;
  /** Sheet overlaps the bottom of the media to hide gaps at rounded corners. */
  sheetOverlapPx?: number;
  className?: string;
}

export function DoorAccessStageLayout({
  media,
  sheet,
  mediaOverlay,
  mediaTopOverlay,
  aboveMedia,
  belowMedia,
  sheetOverlapPx = DEFAULT_SHEET_OVERLAP_PX,
  className,
}: DoorAccessStageLayoutProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  useLayoutEffect(() => {
    const node = sheetRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setSheetHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [sheet]);

  const spacerHeight = Math.max(0, sheetHeight - sheetOverlapPx);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-x-hidden', className)}>
      {aboveMedia ? <div className="shrink-0">{aboveMedia}</div> : null}

      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden"
        style={{ marginBottom: -sheetOverlapPx }}
      >
        <div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
          <div className="h-full w-full">{media}</div>
          {mediaTopOverlay ? (
            <div className="pointer-events-auto absolute inset-x-0 top-0 z-[2] overflow-x-hidden">
              {mediaTopOverlay}
            </div>
          ) : null}
          {mediaOverlay ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1]">{mediaOverlay}</div>
          ) : null}
        </div>
      </div>

      {belowMedia ? <div className="shrink-0">{belowMedia}</div> : null}

      <div
        aria-hidden
        className="pointer-events-none shrink-0 transition-[height] duration-200 ease-out"
        style={{ height: spacerHeight }}
      />

      <div
        ref={sheetRef}
        className={doorAccessSheetFixedClass}
        style={{ marginTop: -sheetOverlapPx }}
      >
        {sheet}
      </div>
    </div>
  );
}
