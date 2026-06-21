import Image from 'next/image';
import { resolveTenantBrand } from '../lib/resolveTenantBrand';
import { cn } from '@/shared/lib/utils';

export interface TenantBrandProps {
  surface: 'landing' | 'app';
  name: string;
  logoUrl?: string | null;
  className?: string;
}

function AppBadge() {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      App
    </span>
  );
}

export function TenantBrand({ surface, name, logoUrl, className }: TenantBrandProps) {
  const brand = resolveTenantBrand({ name, logoUrl });
  const isLanding = surface === 'landing';

  if (brand.kind === 'logo') {
    const maxHeight = isLanding ? 64 : 56;
    return (
      <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
        <Image
          src={brand.src}
          alt={brand.alt}
          width={isLanding ? 320 : 280}
          height={maxHeight}
          className={cn(
            'h-auto w-auto object-contain object-left',
            isLanding ? 'max-h-16' : 'max-h-14'
          )}
          priority={surface === 'app'}
        />
        {surface === 'app' ? <AppBadge /> : null}
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className={cn(
          'truncate font-semibold text-foreground',
          isLanding ? 'text-[2rem] leading-tight' : 'text-[1.75rem] leading-tight'
        )}
      >
        {brand.name}
      </span>
      {surface === 'app' ? <AppBadge /> : null}
    </div>
  );
}
