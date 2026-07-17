import { OWNER_DASHBOARD_MOBILE_UI_ENABLED } from '../config/ownerDashboardUi';

interface OwnerDesktopRequiredGateProps {
  blocker: React.ReactNode;
  children: React.ReactNode;
}

/**
 * When mobile UI is disabled, hide app content below the `lg` breakpoint and show
 * the desktop-required blocker instead. Mobile UI path is preserved via the flag.
 */
export function OwnerDesktopRequiredGate({ blocker, children }: OwnerDesktopRequiredGateProps) {
  if (OWNER_DASHBOARD_MOBILE_UI_ENABLED) {
    return children;
  }

  return (
    <>
      <div className="lg:hidden">{blocker}</div>
      <div className="hidden lg:block">{children}</div>
    </>
  );
}
