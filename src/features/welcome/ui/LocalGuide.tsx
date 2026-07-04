'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { Button, Card, CardContent, Icon, SegmentedChipBar } from '@/shared/ui';
import { MapPin } from 'lucide-react';
import { resolvePlaceCategoryLucideIcon } from '@/entities/hostel';
import {
  getVisibleTabIds,
  hostelPlaceToGuestRecommendation,
  limitRecommendationsForAllTab,
  placeToGuestRecommendation,
  resolveActiveLocalGuideTab,
  sortGuestRecommendations,
  splitCityRecommendations,
  type GuestRecommendation,
} from '../model/guestRecommendation';
import {
  ALL_TAB_INITIAL_LIMIT,
  DEFAULT_LOCAL_GUIDE_TAB,
  type LocalGuideCategoryTabId,
} from '../model/localGuideConstants';
import { RecommendationCard } from './RecommendationCard';
import { EssentialsSection } from './EssentialsSection';

export type LocalGuideVariant = 'compact' | 'full';

const COMPACT_NEAR_HOSTEL_LIMIT = 2;
const COMPACT_ESSENTIALS_LIMIT = 3;

function resolveGuideTabIcon(tabId: string) {
  if (tabId === 'all') {
    return undefined;
  }

  return resolvePlaceCategoryLucideIcon(tabId as LocalGuideCategoryTabId);
}

function RecommendationsList({
  recommendations,
  activeTab,
  t,
}: {
  recommendations: GuestRecommendation[];
  activeTab: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (recommendations.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-xs">{t('emptyCategory')}</p>;
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          activeTab={activeTab}
          categoryLabel={
            activeTab === 'all' && recommendation.scope === 'city'
              ? t(`tabs.${recommendation.category}`)
              : undefined
          }
          openInMapsLabel={t('openInMaps')}
          topPickLabel={recommendation.isTopPick ? t('topPick') : undefined}
        />
      ))}
    </div>
  );
}

function MapCard({
  customMapUrl,
  hostelName,
  t,
}: {
  customMapUrl: string;
  hostelName: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <a href={customMapUrl} target="_blank" rel="noopener noreferrer" className="group block">
      <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 p-3.5 transition-colors">
        <CardContent className="flex items-center justify-between gap-3 p-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="border-primary/20 bg-card shrink-0 rounded-lg border p-2 shadow-xs">
              <Icon icon={MapPin} className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                {t('mapCard.title', { hostelName })}
                <span className="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
              </h4>
              <p className="text-muted-foreground truncate pr-2 text-sm">
                {t('mapCard.description')}
              </p>
            </div>
          </div>
          <span className="text-primary shrink-0 text-sm font-bold transition-transform select-none group-hover:translate-x-0.5">
            →
          </span>
        </CardContent>
      </Card>
    </a>
  );
}

interface LocalGuideProps {
  variant?: LocalGuideVariant;
}

export function LocalGuide({ variant = 'full' }: LocalGuideProps) {
  const isCompact = variant === 'compact';
  const { name, cityPack, settings } = useTenant();
  const t = useTranslations(cityPack.locale.guideNamespace);
  const hostel = useHostelConfig();

  const hostelPlaces = useMemo(
    () =>
      sortGuestRecommendations(
        (settings.hostelPlaces ?? [])
          .filter((place) => place.name.trim())
          .map((place) => hostelPlaceToGuestRecommendation(place, t))
      ),
    [settings.hostelPlaces, t]
  );

  const allCityRecommendations = useMemo(
    () =>
      sortGuestRecommendations(
        cityPack.places.map((place) => placeToGuestRecommendation(place, t))
      ),
    [cityPack.places, t]
  );

  const { utilities, explore } = useMemo(
    () => splitCityRecommendations(allCityRecommendations),
    [allCityRecommendations]
  );

  const [activeTab, setActiveTab] = useState<string>(DEFAULT_LOCAL_GUIDE_TAB);
  const [allTabExpanded, setAllTabExpanded] = useState(false);

  const visibleTabIds = useMemo(() => getVisibleTabIds(explore), [explore]);

  useEffect(() => {
    setActiveTab((current) =>
      resolveActiveLocalGuideTab(current, visibleTabIds, DEFAULT_LOCAL_GUIDE_TAB)
    );
  }, [visibleTabIds]);

  const mapId = hostel.sources.recommendation.map;
  const customMapUrl = mapId ? `${SITE_CONFIG.googleMapsViewerPrefix}${mapId}` : null;

  const visibleHostelPlaces = isCompact
    ? hostelPlaces.slice(0, COMPACT_NEAR_HOSTEL_LIMIT)
    : hostelPlaces;

  const getRecommendationsForTab = (tabId: string) => {
    if (tabId === 'all') {
      return explore;
    }

    return explore.filter((recommendation) => recommendation.category === tabId);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'all') {
      setAllTabExpanded(false);
    }
  };

  const tabRecommendations = getRecommendationsForTab(activeTab);
  const {
    visible: visibleRecommendations,
    hasMore,
    total,
  } = limitRecommendationsForAllTab(
    tabRecommendations,
    activeTab,
    allTabExpanded,
    ALL_TAB_INITIAL_LIMIT
  );

  if (isCompact) {
    const hasContent =
      visibleHostelPlaces.length > 0 || utilities.length > 0 || customMapUrl != null;

    if (!hasContent) {
      return null;
    }

    return (
      <section className="animate-fade-in space-y-5">
        {visibleHostelPlaces.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t('nearHostel.title')}
              </h3>
              <p className="text-muted-foreground text-xs">{t('nearHostel.subtitle')}</p>
            </div>
            <RecommendationsList recommendations={visibleHostelPlaces} activeTab="all" t={t} />
          </div>
        ) : null}

        <EssentialsSection
          utilities={utilities}
          limit={COMPACT_ESSENTIALS_LIMIT}
          openInMapsLabel={t('openInMaps')}
          t={t}
        />

        {customMapUrl ? <MapCard customMapUrl={customMapUrl} hostelName={name} t={t} /> : null}
      </section>
    );
  }

  return (
    <section className="animate-fade-in space-y-5">
      <EssentialsSection
        utilities={utilities}
        openInMapsLabel={t('openInMaps')}
        t={t}
      />

      {hostelPlaces.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {t('nearHostel.title')}
            </h3>
            <p className="text-muted-foreground text-xs">{t('nearHostel.subtitle')}</p>
          </div>
          <RecommendationsList recommendations={hostelPlaces} activeTab="all" t={t} />
        </div>
      ) : null}

      <div className="space-y-1">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {hostelPlaces.length > 0
            ? t('nearHostel.exploreCityTitle')
            : t('title', { hostelName: name })}
        </h3>
        <p className="text-muted-foreground text-xs">
          {hostelPlaces.length > 0 ? t('nearHostel.exploreCitySubtitle') : t('subtitle')}
        </p>
      </div>

      {customMapUrl ? <MapCard customMapUrl={customMapUrl} hostelName={name} t={t} /> : null}

      {visibleTabIds.length === 0 ? (
        <RecommendationsList recommendations={[]} activeTab="all" t={t} />
      ) : (
        <div className="space-y-3">
          <div className="border-border/60 bg-background/95 sticky top-0 z-10 -mx-4 border-b px-4 py-2 backdrop-blur-sm sm:mx-0 sm:px-0">
            <SegmentedChipBar
              items={visibleTabIds.map((tabId) => ({
                id: tabId,
                label: t(`tabs.${tabId}`),
                icon: resolveGuideTabIcon(tabId),
              }))}
              value={activeTab}
              onValueChange={handleTabChange}
              ariaLabel={t('title', { hostelName: name })}
              className="py-0"
            />
          </div>
          <RecommendationsList
            recommendations={visibleRecommendations}
            activeTab={activeTab}
            t={t}
          />
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAllTabExpanded(true)}
            >
              {t('showAllPlaces', { count: String(total) })}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
