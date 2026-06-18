'use client';

import { useState, useEffect } from 'react';
import { LOCAL_PLACES, Place } from './places.data'; // путь к нашим данным

export function useLocalGuideFilters(isNightModeFromParent: boolean) {
  const [isFirstNight, setIsFirstNight] = useState(false);
  const [userWantsToSeeAll, setUserWantsToSeeAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const todayString = new Date().toDateString();
      const savedDate = localStorage.getItem('oasis_first_night_date');

      if (!savedDate) {
        // Фиксируем дату заезда
        localStorage.setItem('oasis_first_night_date', todayString);
        setIsFirstNight(true);
      } else {
        // Если дата совпадает с сохраненной — это первая ночь
        setIsFirstNight(savedDate === todayString);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ключевая логика фильтрации массива
  const filteredPlaces = LOCAL_PLACES.filter((place) => {
    // Если сейчас ночь и это первая ночь, и юзер не нажал "показать всё" -> только Survival
    if (isNightModeFromParent && isFirstNight && !userWantsToSeeAll) {
      return place.isSurvival;
    }
    // В остальных случаях (день или следующие ночи) показываем всё
    return true;
  });

  return {
    filteredPlaces,
    // Показываем тизер, только если это ночь, первая ночь и юзер еще не кликнул "показать всё"
    showMorningTeaser: isNightModeFromParent && isFirstNight && !userWantsToSeeAll,
    userWantsToSeeAll,
    isLoading,
    enableAllPlaces: () => setUserWantsToSeeAll(true),
  };
}
