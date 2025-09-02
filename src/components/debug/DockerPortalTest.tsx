"use client"

import { useEffect, useState } from 'react'

export default function DockerPortalTest() {
  const [domInfo, setDomInfo] = useState<any>({})

  useEffect(() => {
    const checkDOM = () => {
      setDomInfo({
        // Basic DOM checks
        hasDocument: typeof document !== 'undefined',
        hasBody: !!document?.body,
        bodyChildren: document?.body?.children.length || 0,
        location: window?.location?.href || 'unknown',
        
        // Portal-specific checks
        canCreatePortal: (() => {
          try {
            const testDiv = document.createElement('div')
            testDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; z-index: 99999; background: blue; color: white; padding: 10px;'
            testDiv.innerHTML = 'Portal Test'
            document.body.appendChild(testDiv)
            
            const rect = testDiv.getBoundingClientRect()
            const isVisible = rect.width > 0 && rect.height > 0
            
            setTimeout(() => document.body.removeChild(testDiv), 1000)
            return { success: true, visible: isVisible, rect }
          } catch (e) {
            return { success: false, error: e.message }
          }
        })(),
        
        // CSS checks  
        computedStyles: (() => {
          try {
            const testEl = document.createElement('div')
            document.body.appendChild(testEl)
            const styles = window.getComputedStyle(testEl)
            const result = {
              position: styles.position,
              zIndex: styles.zIndex,
              display: styles.display
            }
            document.body.removeChild(testEl)
            return result
          } catch (e) {
            return { error: e.message }
          }
        })(),
        
        // Environment checks
        userAgent: navigator?.userAgent || 'unknown',
        isDocker: window.location.hostname !== 'localhost',
        timestamp: new Date().toISOString()
      })
    }

    checkDOM()
    const interval = setInterval(checkDOM, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border-2 border-yellow-500 p-4 rounded shadow-lg z-[9999] text-xs max-w-md max-h-96 overflow-auto">
      <div className="font-bold text-yellow-700 mb-2">Docker Portal Diagnosis</div>
      <pre className="whitespace-pre-wrap text-xs">
        {JSON.stringify(domInfo, null, 2)}
      </pre>
    </div>
  )
}