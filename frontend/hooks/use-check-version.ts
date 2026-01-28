'use client'

import { useEffect, useRef } from 'react'
import { apiService } from '@/lib/service'

const RELOAD_KEY = 'app_version_reloaded'

export function useCheckVersion(intervalMs = 10000) {
  const reloading = useRef(false)

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const version = await apiService.getVersion()
        const storedVersion = localStorage.getItem('app_version')

        if (!storedVersion) {
          localStorage.setItem('app_version', version)
          return
        }

        if (storedVersion !== version) {
          // Prevent reload loops
          if (sessionStorage.getItem(RELOAD_KEY)) return

          sessionStorage.setItem(RELOAD_KEY, 'true')
          localStorage.setItem('app_version', version)

          reloading.current = true
          window.location.reload()
        }
      } catch (err) {
        
        console.error('Version check failed:', err)
      }
    }

    checkVersion()
    const id = setInterval(checkVersion, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
