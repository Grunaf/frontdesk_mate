import React from 'react';

export function HostelInfo() {
  return (
    <section className="px-4 pt-6 space-y-6">
      {/* Приветствие */}
      <header className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Добро пожаловать в Сараево</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sarajevo Oasis Hostel</h1>
      </header>

      {/* Тайминги */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="text-center p-2">
          <span className="block text-xs text-slate-500 font-medium">Заезд (Check-in)</span>
          <span className="text-base font-bold text-slate-800">с 14:00</span>
        </div>
        <div className="border-l border-slate-200 text-center p-2">
          <span className="block text-xs text-slate-500 font-medium">Выезд (Check-out)</span>
          <span className="text-base font-bold text-slate-800">до 11:00</span>
        </div>
      </div>

      {/* Фото-визуализация фасада */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Ориентир на месте:</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-slate-100">
            <img 
              src="/images/facade.jpg" 
              alt="Фасад здания хостела с улицы" 
              className="object-cover w-full h-full"
              loading="eager"
            />
          </div>
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-slate-100">
            <img 
              src="/images/entrance.jpg" 
              alt="Входная дверь в хостел" 
              className="object-cover w-full h-full"
              loading="eager"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 italic">
          Ищите деревянную дверь с логотипом хостела справа от главного входа.
        </p>
      </div>

      {/* Как добраться */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Как добраться:</h3>
        
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 text-base">🚶‍♂️</span>
            <p><strong>От Латинского моста (Центр):</strong> 5 минут пешком вверх по улице Safvet-bega Bašagića.</p>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 text-base">🚋</span>
            <p><strong>От Ж/Д вокзала:</strong> Трамвай №1 до остановки Baščaršija (около 15 минут, билет у водителя стоит 1.80 KM).</p>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex-shrink-0 text-base">🚕</span>
            <p><strong>Из аэропорта (Аэропорт Сараево):</strong> Честная цена на такси — около 20–25 KM (€10–€13). Всегда просите включить таксометр (счётчик) перед поездкой.</p>
          </li>
        </ul>
      </div>
    </section>
  );
}