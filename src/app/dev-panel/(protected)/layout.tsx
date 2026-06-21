import { redirect } from 'next/navigation';
import { isDevPanelAuthenticated } from '../lib/devPanelSession';
import { assertDevPanelAvailable } from '../lib/guardDevPanel';

export default async function ProtectedDevPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  assertDevPanelAvailable();

  if (!(await isDevPanelAuthenticated())) {
    redirect('/dev-panel/login?next=/dev-panel');
  }

  return children;
}
