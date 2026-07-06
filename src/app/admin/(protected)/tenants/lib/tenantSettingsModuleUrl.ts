export const SETTINGS_MODULE_QUERY = 'module';

export function appendSettingsModuleToUrl(pathname: string, moduleId: string): string {
  const url = new URL(pathname, 'http://local');
  url.searchParams.set(SETTINGS_MODULE_QUERY, moduleId);
  return `${url.pathname}${url.search}`;
}

export function stripSettingsModuleFromUrl(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SETTINGS_MODULE_QUERY);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
