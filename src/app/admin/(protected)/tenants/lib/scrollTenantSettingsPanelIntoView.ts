export const TENANT_SETTINGS_PANEL_ID = 'tenant-settings-panel';

export function scrollToSectionTarget(target: HTMLElement, stickyOffset: number) {
  const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

/** Align settings panel top under sticky chrome; skip if already aligned. */
export function scrollTenantSettingsPanelIntoView(stickyOffset: number) {
  const panel = document.getElementById(TENANT_SETTINGS_PANEL_ID);
  if (!panel) {
    return;
  }

  const panelTop = panel.getBoundingClientRect().top;
  if (Math.abs(panelTop - stickyOffset) <= 12) {
    return;
  }

  scrollToSectionTarget(panel, stickyOffset);
}
