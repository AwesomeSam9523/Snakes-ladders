'use client';

import * as React from 'react';

export function useCheckVersion() {

  React.useEffect(() => {
    async function checkVersion() {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const data = await fetch(`${API_URL}/version`);
      const version = (await data.json()).version;
      const currentVersion = localStorage.getItem('app_version') || null;

      if (currentVersion === null) {
        return localStorage.setItem('app_version', version);
      } else if (currentVersion !== version) {
        localStorage.setItem('app_version', version);
        window.location.reload();
      }
    }

    checkVersion().then(() => {
      console.log('API Version:', localStorage.getItem('app_version'));
    })
  }, [])
}
