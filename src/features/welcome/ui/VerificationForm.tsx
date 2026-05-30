'use client';

import React, { useState } from 'react';

interface VerificationFormProps {
  onVerified: () => void;
}

export function VerificationForm({ onVerified }: VerificationFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Временная заглушка для теста. Позже заменим на вызов Server Action
    if (code.trim() === '1234' || code.trim().toLowerCase() === 'sarajevo') {
      onVerified();
    } else {
      setError('Неверный код бронирования. Проверьте email или сообщение.');
    }
  };

  return (
    <section className="px-4 py-2 space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
        🔑 <strong>Внимание:</strong> Информация о заселении (пароли от дверей и Wi-Fi) скрыта из соображений безопасности. Введите ваш код бронирования для доступа.
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="booking-code" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Код бронирования (Booking Code)
          </label>
          <input
            id="booking-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Например: 1234"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900"
            required
          />
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600 animate-pulse">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 active:scale-[0.99]"
        >
          Получить доступ к хостелу
        </button>
      </form>
    </section>
  );
}