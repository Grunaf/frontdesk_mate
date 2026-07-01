import { SITE_CONFIG, getPublicProtocol } from '@/shared/config';

export function ReceptionUnknownHostelContent() {
  const protocol = getPublicProtocol();
  const base = SITE_CONFIG.baseDomain;
  const exampleHost = `yourhostel.reception.${base.split(':')[0]}`;

  return (
    <div className="mx-auto max-w-md space-y-3 py-12 text-center">
      <h1 className="text-lg font-semibold">Hostel not found</h1>
      <p className="text-sm text-muted-foreground">
        This reception URL does not match a hostel in our system. Use the link your property gave you,
        for example{' '}
        <code className="text-xs">
          {protocol}
          {exampleHost}
        </code>
        .
      </p>
    </div>
  );
}
