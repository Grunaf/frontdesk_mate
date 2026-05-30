'use client';

import React, { useState } from 'react';

interface PrivateContentProps {
  mode: 'self' | 'onsite';
}

export function PrivateContent({ mode }: PrivateContentProps) {
  const [copied, setCopied] = useState(false);
  
  const wifiPassword = "OasisHostel2026"; // Пример пароля

  const handleCopyWifi = async () => {
    try {
      await navigator.clipboard.writeText(wifiPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Сброс статуса через 2 сек
    } catch (err) {
      console.error('Не удалось скопировать', err);
    }
  };

  // Компонент видео-румтура, чтобы не дублировать разметку
  const VideoTour = () => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <span>📹</span> Видео-инструкция (Рум-тур)
      </h3>
      <div className="aspect-video rounded-xl overflow-hidden bg-black border border-slate-100 shadow-inner">
        <video 
          src="/videos/room-tour.mp4" 
          controls 
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
      <p className="text-xs text-slate-500">
        Короткое видео: как найти комнату, где взять постельное белье и правила тишины.
      </p>
    </div>
  );

  return (
    <section className="px-4 space-y-6">
      
      {/* Карточки доступов */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Данные для доступа
        </h3>

        {/* Пароль от входной двери (нужен только при Self Check-in) */}
        {mode === 'self' && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="block text-xs font-medium text-indigo-600">Код от входной двери</span>
              <span className="text-xl font-mono font-bold text-indigo-950 tracking-wider">#4432*</span>
            </div>
            <span className="text-2xl">🚪</span>
          </div>
        )}

        {/* Wi-Fi с кнопкой быстрого копирования */}
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-xs font-medium text-emerald-700">Сеть: Oasis_Guest</span>
            <span className="text-sm font-mono font-bold text-emerald-950 block mt-0.5">
              Пароль: {wifiPassword}
            </span>
          </div>
          <button
            onClick={handleCopyWifi}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              copied 
                ? 'bg-emerald-600 text-white scale-95' 
                : 'bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
        </div>
      </div>

      {/* Условный рендеринг видео в зависимости от сценария */}
      {mode === 'self' && <VideoTour />}

      {/* Задел на будущее (Поле для онлайн-регистрации) */}
      {/* <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-400 text-center">Онлайн-чек ин (В разработке)</p>
      </div> 
      */}

      {/* Если это onsite, видео отрендерится в самом низу, после гида */}
      {mode === 'onsite' && (
        <div className="pt-4 border-t border-slate-100">
          <VideoTour />
        </div>
      )}
      
    </section>
  );
}