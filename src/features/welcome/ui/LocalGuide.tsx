import React from 'react';
import { GUIDE_DATA, PlaceToVisit } from '../model/constants';

// Хелпер для иконок категорий
const getCategoryIcon = (category: PlaceToVisit['category']) => {
  switch (category) {
    case 'food': return '🍖';
    case 'exchange': return '💱';
    case 'shop': return '🛒';
    default: return '📍';
  }
};

export function LocalGuide() {
  return (
    <section className="px-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Локальный гид от хостела
        </h3>
        <p className="text-xs text-slate-500">
          Собрали для вас проверенные места в Сараево, чтобы вы не переплачивали как турист.
        </p>
      </div>

      <div className="space-y-3">
        {GUIDE_DATA.map((place, index) => (
          <div 
            key={index}
            className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3 items-start"
          >
            <div className="text-xl bg-white p-2 rounded-lg shadow-sm shrink-0">
              {getCategoryIcon(place.category)}
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {place.name}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {place.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}