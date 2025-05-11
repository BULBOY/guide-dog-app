'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

export default function Home() {
  const [appState, setAppState] = useState('welcome') // welcome, permissions, navigating
  const [speechSupported, setSpeechSupported] = useState(false)
  
  useEffect(() => {
    // Check for speech synthesis support
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true)
    }
    
    // Speak welcome message
    if (speechSupported) {
      const welcomeMsg = new SpeechSynthesisUtterance('Welcome to AI Guide Dog. Tap the screen to start.')
      window.speechSynthesis.speak(welcomeMsg)
    }
  }, [speechSupported])
  
  const requestPermissions = async () => {
    try {
      // Request camera permission
      await navigator.mediaDevices.getUserMedia({ video: true })
      
      // Success - move to navigation mode
      setAppState('navigating')
      
      if (speechSupported) {
        const successMsg = new SpeechSynthesisUtterance('Permissions granted. Starting navigation assistant.')
        window.speechSynthesis.speak(successMsg)
      }
    } catch (error) {
      console.error('Permission error:', error)
      
      if (speechSupported) {
        const errorMsg = new SpeechSynthesisUtterance('Camera permission is required for navigation. Please grant permission and try again.')
        window.speechSynthesis.speak(errorMsg)
      }
    }
  }
  
  const startApp = () => {
    setAppState('permissions')
  }
  
  return (
    <main className="flex flex-col items-center justify-center p-4 text-center" style={{ minHeight: '100vh' }}>
      {appState === 'welcome' && (
        <div className="welcome-screen" onClick={startApp}>
          <h1 className="text-4xl font-bold mb-6">AI Guide Dog</h1>
          <p className="text-xl mb-8">A navigation assistant for the visually impaired</p>
          
          <div className="p-6 bg-blue-100 rounded-lg mb-8">
            <p className="text-lg">Tap anywhere on screen to start</p>
          </div>
          
          <div className="features">
            <div className="feature">
              <h3 className="font-bold">Object Detection</h3>
              <p>Identifies obstacles and objects around you</p>
            </div>
            <div className="feature">
              <h3 className="font-bold">Audio Guidance</h3>
              <p>Provides spoken directions and alerts</p>
            </div>
            <div className="feature">
              <h3 className="font-bold">Voice Control</h3>
              <p>Control the app with voice commands</p>
            </div>
          </div>
        </div>
      )}
      
      {appState === 'permissions' && (
        <div className="permissions-screen">
          <h2 className="text-2xl font-bold mb-4">Camera Access Required</h2>
          <p className="mb-6">AI Guide Dog needs access to your camera to detect objects and provide navigation assistance.</p>
          
          <button 
            className="p-4 bg-green-600 text-white text-xl rounded-lg w-full"
            onClick={requestPermissions}
            style={{ maxWidth: '28rem' }}
          >
            Grant Camera Access
          </button>
          
          <p className="mt-4 text-sm text-gray-600">
            Your camera feed is processed on-device and is not stored or transmitted.
          </p>
        </div>
      )}
      
      {appState === 'navigating' && (
        <Navigation />
      )}
    </main>
  )
}