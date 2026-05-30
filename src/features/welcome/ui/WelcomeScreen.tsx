'use client';

import { useState } from 'react';
import { HostelInfo } from './HostelInfo';
import { FAQAccordion } from './FAQAccordion';
import { VerificationForm } from './VerificationForm';
import { PrivateContent } from './PrivateContent';
import { LocalGuide } from './LocalGuide';

interface WelcomeScreenProps {
  isOnsite: boolean;
}

export function WelcomeScreen({ isOnsite }: WelcomeScreenProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-xl flex flex-col justify-between pb-12">
        
        <div>
          <HostelInfo />
          <hr className="border-slate-100 my-6" />

          <div className="space-y-6">
            {isOnsite ? (
              <>
                <PrivateContent mode="onsite" />
                <LocalGuide />
              </>
            ) : (
              <>
                {!isAuthenticated ? (
                  <VerificationForm onVerified={() => setIsAuthenticated(true)} />
                ) : (
                  <PrivateContent mode="self" />
                )}
              </>
            )}
          </div>
        </div>

        <footer className="mt-12 px-4">
          <hr className="border-slate-100 mb-6" />
          <FAQAccordion />
        </footer>
        
      </div>
    </main>
  );
}