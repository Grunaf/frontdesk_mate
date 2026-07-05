'use client';

import { useEffect } from 'react';

const ADMIN_SHELL_CLASS = 'admin-shell-bg';

export function AdminShellBackground() {
  useEffect(() => {
    document.body.classList.add(ADMIN_SHELL_CLASS);

    return () => {
      document.body.classList.remove(ADMIN_SHELL_CLASS);
    };
  }, []);

  return null;
}
