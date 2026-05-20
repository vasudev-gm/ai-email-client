"use client"

import { useEffect } from "react"

export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator.serviceWorker?.register !== "function") return

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister()
        })
      })
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Service worker registration failed", error)
    })
  }, [])

  return null
}
