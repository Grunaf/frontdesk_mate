'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface AdminSettingsPanelBreadcrumbsProps {
  sectionLabel: string;
  moduleLabel: string;
  onBackToHub: () => void;
  backAriaLabel: string;
}

export function AdminSettingsPanelBreadcrumbs({
  sectionLabel,
  moduleLabel,
  onBackToHub,
  backAriaLabel,
}: AdminSettingsPanelBreadcrumbsProps) {
  return (
    <nav
      className="flex min-w-0 items-center gap-1 text-sm"
      aria-label="Breadcrumb"
    >
      <button
        type="button"
        onClick={onBackToHub}
        className="inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label={backAriaLabel}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onBackToHub}
        className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {sectionLabel}
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      <span className="min-w-0 truncate font-semibold text-foreground" aria-current="page">
        {moduleLabel}
      </span>
    </nav>
  );
}
