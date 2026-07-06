'use client';

import { useEffect } from 'react';

const ADMIN_SHELL_CLASS = 'admin-shell-bg';
const ADMIN_HTML_CLASS = 'admin-stable-layout';

export function AdminShellBackground() {
  useEffect(() => {
    document.documentElement.classList.add(ADMIN_HTML_CLASS);
    document.body.classList.add(ADMIN_SHELL_CLASS);

    return () => {
      document.documentElement.classList.remove(ADMIN_HTML_CLASS);
      document.body.classList.remove(ADMIN_SHELL_CLASS);
    };
  }, []);

  return null;
}
