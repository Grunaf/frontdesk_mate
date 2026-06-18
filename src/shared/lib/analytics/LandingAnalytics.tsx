'use client';

import { SITE_CONFIG } from '@/shared/config';
import Script from 'next/script';

export function LandingAnalytics() {
  if (!SITE_CONFIG.isAnalyticsEnabled) {
    return null;
  }

  return (
    <Script id="google-tag-manager" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-PMP28ZZF');
      `}
    </Script>
  );
}
