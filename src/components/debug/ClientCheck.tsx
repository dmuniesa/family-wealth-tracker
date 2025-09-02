"use client"

import { useEffect, useState } from 'react'

export default function ClientCheck() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className="text-red-500 text-xs">⚠️ JS Not Loaded</div>
  }

  return <div className="text-green-500 text-xs">✅ JS Working</div>
}