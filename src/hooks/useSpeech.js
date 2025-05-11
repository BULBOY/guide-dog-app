import { useState, useEffect } from 'react'
import { speak as speakUtil, stopSpeaking } from '@/utils/speech'

/**
 * Hook for text-to-speech functionality
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  
  // Check for speech synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true)
      
      // Track speaking state
      const onStart = () => setIsSpeaking(true)
      const onEnd = () => setIsSpeaking(false)
      
      // Add event listeners to update speaking state
      window.speechSynthesis.addEventListener('start', onStart)
      window.speechSynthesis.addEventListener('end', onEnd)
      
      return () => {
        window.speechSynthesis.removeEventListener('start', onStart)
        window.speechSynthesis.removeEventListener('end', onEnd)
      }
    }
  }, [])
  
  /**
   * Speak text with options
   */
  const speak = (text, options = {}) => {
    if (!isSupported) return
    
    // Use utility from speech.js
    speakUtil(text, {
      ...options,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false)
    })
  }
  
  /**
   * Stop speaking and clear queue
   */
  const stop = () => {
    if (!isSupported) return
    
    stopSpeaking()
    setIsSpeaking(false)
  }
  
  return {
    speak,
    stop,
    isSpeaking,
    isSupported
  }
}

export default useSpeech