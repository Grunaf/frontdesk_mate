import { GuestExtrasBlock } from '@/features/guest-services';

export default async function ServicesPage() {
  return (
    <div className="px-4 py-6">
      <GuestExtrasBlock variant="full" />
    </div>
  );
}
