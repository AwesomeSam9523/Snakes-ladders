'use client'

import {useEffect, useRef} from 'react'
import {apiService} from '@/lib/service'

export function useCheckVersion() {
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

        console.log(`Current version: ${storedVersion}, Fetched version: ${version}, Equal: ${storedVersion === version}`)

        if (storedVersion !== version) {
          localStorage.setItem('app_version', version)

          reloading.current = true
          console.log('Reloading app due to version change...')
          window.location.reload()
        }
      } catch (err) {
        console.error('Version check failed:', err)
      }
    }

    checkVersion()
    const id = setInterval(checkVersion, 10000)
    return () => clearInterval(id)
  }, [])
}
