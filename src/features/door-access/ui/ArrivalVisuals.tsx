'use client';

import { useRef, useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { useNightMode } from '@/shared/lib';
import { HOSTEL_CONFIG } from '@/shared/config';
import { ImageLandmark } from './ImageLandmark';

interface DoorSlide {
  id: number;
  titleKey: 'mainDoor.title' | 'subDoor.title';
  src: string;
  alt: string;
  codeLabelKey: 'mainDoor.codeLabel' | 'subDoor.codeLabel';
  codeValue?: string;
  showCode: boolean;
  guideKey?: 'subDoor.guide';
}

function SlideGuide({
  slide,
  doors,
}: {
  slide: DoorSlide;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
}) {
  if (!slide.guideKey) return null;

  return (
    <div className="animate-fade-in absolute top-3 right-3 left-3 z-10 rounded-lg border border-border/40 bg-foreground/80 p-2.5 text-[11px] leading-relaxed text-background backdrop-blur-md">
      <p>{doors(slide.guideKey)}</p>
    </div>
  );
}

function SlideCode({
  slide,
  doors,
}: {
  slide: DoorSlide;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
}) {
  if (!slide.showCode) return null;

  return (
    <div className="animate-fade-in absolute right-3 bottom-3 z-10 flex items-center gap-2 rounded-lg border border-border/40 bg-foreground/80 px-3 py-1.5 text-background shadow-lg backdrop-blur-md">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {doors(slide.codeLabelKey)}
      </span>
      <span className="font-mono text-sm font-bold tracking-wider text-primary">{slide.codeValue}</span>
    </div>
  );
}

export function ArrivalVisuals() {
  const t = useTranslations('pages.arrivalJourney');
  const doors = useTranslations('domains.hostel.enter.doors');
  const [activePhoto, setActivePhoto] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNightMode = useNightMode();

  const slides: DoorSlide[] = [
    {
      id: 0,
      titleKey: 'mainDoor.title',
      src: '/images/entrance.jpg',
      alt: 'Hostel Entrance Door',
      codeLabelKey: 'mainDoor.codeLabel',
      codeValue: HOSTEL_CONFIG.doors.codes.mainDoor,
      showCode: isNightMode,
    },
    ...(isNightMode
      ? [
          {
            id: 1,
            titleKey: 'subDoor.title' as const,
            src: '/images/basement_entrance.jpg',
            alt: 'Basement Entrance',
            codeLabelKey: 'subDoor.codeLabel' as const,
            codeValue: HOSTEL_CONFIG.doors.codes.subDoor,
            showCode: true,
            guideKey: 'subDoor.guide' as const,
          },
        ]
      : []),
  ];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / (width * 0.85));
    setActivePhoto(index);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('arrival.visuals')}</h3>
        {isNightMode && (
          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground uppercase">
            {activePhoto + 1} / {slides.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((slide, index) => {
          const isActive = activePhoto === index;

          return (
            <div
              key={slide.id}
              className="w-[85%] shrink-0 origin-center transform snap-center transition-all duration-300"
            >
              <div
                className={`space-y-2 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-95 opacity-60'}`}
              >
                <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                  {doors(slide.titleKey)}
                </p>

                <div className="group relative overflow-hidden rounded-xl">
                  <ImageLandmark src={slide.src} alt={slide.alt} />
                  {isActive && <SlideGuide slide={slide} doors={doors} />}
                  <SlideCode slide={slide} doors={doors} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
