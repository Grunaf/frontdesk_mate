import React from 'react';
import { FAQ_DATA } from '../model/constants';

export function FAQAccordion() {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Полезная информация
      </h3>
      
      <div className="space-y-2">
        {FAQ_DATA.map((item, index) => (
          <details 
            key={index} 
            className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-slate-900">
              <span className="text-sm font-medium">
                {item.question}
              </span>
              <span className="shrink-0 rounded-full bg-white p-1.5 text-slate-500 shadow-sm transition group-open:-rotate-180">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}