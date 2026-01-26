'use client';

import * as React from 'react';
import {apiService} from "@/lib/service";

export function useCheckVersion() {

  React.useEffect(() => {
    async function checkVersion() {
      const version = await apiService.getVersion();
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
