"use client"

import { useEffect } from "react"

export default function PWARegister() {
  useEffect(() => {
    if (!navigator.serviceWorker?.register) return

    void navigator.serviceWorker.register("/sw.js")
  }, [])

  return null
}
