'use client';

import React, { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { useLocalGuideFilters } from '../model/useLocalGuideFilters';
import { useNightMode } from '@/shared/lib';
import { HOSTEL_CONFIG } from '@/shared/config';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { MapPin } from 'lucide-react';
import type { Place } from '../model/places.data';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'essential':
      return 'I';
    case 'food':
      return 'F';
    case 'bars':
      return 'B';
    case 'cafes':
      return 'C';
    case 'sights':
      return 'S';
    default:
      return 'M';
  }
};

const TAB_IDS = ['all', 'essential', 'food', 'bars', 'cafes', 'sights'] as const;

function PlaceCard({
  place,
  t,
}: {
  place: Place;
  t: ReturnType<typeof useTranslations<'domains.hostel.inside.guide'>>;
}) {
  return (
    <Card className="gap-0 p-3.5 transition-colors hover:bg-muted/80">
      <CardContent className="flex items-start gap-3 p-0">
        <div className="shrink-0 rounded-lg border border-border/40 bg-background p-2 text-xl shadow-xs select-none">
          {getCategoryIcon(place.category)}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-bold text-foreground">{place.name}</h4>
            <Badge variant="outline" className="text-[9px] font-extrabold tracking-wider uppercase">
              {place.tag}
            </Badge>
            {place.recommendedBy && (
              <Badge variant="secondary" className="text-[9px] font-medium">
                {t('recommendedBy', { name: place.recommendedBy })}
              </Badge>
            )}
          </div>

          <p className="text-[11px] font-medium text-muted-foreground">{t(place.subCategoryKey)}</p>

          <p className="pr-1 text-xs leading-relaxed text-muted-foreground">
            {t(place.descriptionKey)}
          </p>

          <div className="pt-1.5">
            <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                {t('routeButton')}
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlacesList({
  places,
  t,
}: {
  places: Place[];
  t: ReturnType<typeof useTranslations<'domains.hostel.inside.guide'>>;
}) {
  if (places.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">{t('emptyCategory')}</p>
    );
  }

  return (
    <div className="space-y-3">
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} t={t} />
      ))}
    </div>
  );
}

export function LocalGuide() {
  const t = useTranslations('domains.hostel.inside.guide');
  const isNightMode = useNightMode();
  const { filteredPlaces, showMorningTeaser, enableAllPlaces } = useLocalGuideFilters(isNightMode);
  const [activeTab, setActiveTab] = useState<string>('all');

  const hostelName = process.env.NEXT_PUBLIC_HOSTEL_NAME ?? '';

  const customMapUrl = `${process.env.NEXT_PUBLIC_MAP_VIEW_URL}${HOSTEL_CONFIG.sources.recommendation.map}`;

  const getPlacesForTab = (tabId: string) => {
    if (tabId === 'all') return filteredPlaces;
    return filteredPlaces.filter((place) => place.category === tabId);
  };

  return (
    <section className="animate-fade-in space-y-5">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {showMorningTeaser ? t('survivalKit.title') : t('title', { hostelName })}
        </h3>
        <p className="text-xs text-muted-foreground">
          {showMorningTeaser ? t('survivalKit.subtitle') : t('subtitle')}
        </p>
      </div>

      {showMorningTeaser && (
        <Card className="border-primary/30 bg-foreground text-background shadow-lg">
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold tracking-wide text-primary uppercase">
                {t('survivalKit.teaserTitle')}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('survivalKit.teaserDescription')}
              </p>
            </div>
            <Button onClick={enableAllPlaces} size="sm" className="w-full sm:w-auto">
              {t('survivalKit.showAllButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      <a href={customMapUrl} target="_blank" rel="noopener noreferrer" className="group block">
        <Card className="border-primary/20 bg-primary/5 p-3.5 transition-colors hover:bg-primary/10">
          <CardContent className="flex items-center justify-between gap-3 p-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg border border-primary/20 bg-card p-2 shadow-xs">
                <Icon icon={MapPin} className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  {t('mapCard.title', { hostelName })}
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                </h4>
                <p className="truncate pr-2 text-[11px] text-muted-foreground">
                  {t('mapCard.description')}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold text-primary transition-transform select-none group-hover:translate-x-0.5">
              →
            </span>
          </CardContent>
        </Card>
      </a>

      {showMorningTeaser ? (
        <PlacesList places={filteredPlaces} t={t} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            variant="line"
            className="no-scrollbar -mx-4 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {TAB_IDS.map((tabId) => (
              <TabsTrigger
                key={tabId}
                value={tabId}
                className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold text-foreground data-active:border-foreground data-active:bg-foreground data-active:text-background"
              >
                {t(`tabs.${tabId}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_IDS.map((tabId) => (
            <TabsContent key={tabId} value={tabId} className="mt-3">
              <PlacesList places={getPlacesForTab(tabId)} t={t} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}
