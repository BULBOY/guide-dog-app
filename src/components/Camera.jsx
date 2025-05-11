'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useCamera } from '@/hooks/useCamera'

const Camera = forwardRef(function Camera({ 
  isActive, 
  onFrame, 
  style,
  selectedCamera
}, ref) {
  const videoRef = useRef(null)
  const frameInterval = useRef(null)
  const { startCamera, stopCamera } = useCamera()
  const [cameraError, setCameraError] = useState(null)
  
  // Expose video element ref to parent component
  useImperativeHandle(ref, () => videoRef.current)
  
  // Start/stop camera based on isActive prop and selectedCamera
  useEffect(() => {
    if (isActive) {
      startCameraStream()
    } else {
      stopCameraStream()
    }
    
    return () => {
      stopCameraStream()
    }
  }, [isActive, selectedCamera]) // Re-run when selectedCamera changes
  
  // Start camera stream
  const startCameraStream = async () => {
    if (!videoRef.current) return
    
    try {
      setCameraError(null)
      const success = await startCamera(videoRef.current)
      if (success) {
        // Start frame processing
        startFrameProcessing()
      }
    } catch (error) {
      console.error('Error starting camera:', error)
      setCameraError(`Camera error: ${error.message}`)
    }
  }
  
  // Stop camera stream
  const stopCameraStream = () => {
    stopCamera()
    
    // Stop frame processing
    if (frameInterval.current) {
      clearInterval(frameInterval.current)
      frameInterval.current = null
    }
  }
  
  // Start processing frames at regular intervals
  const startFrameProcessing = () => {
    if (frameInterval.current) {
      clearInterval(frameInterval.current)
    }
    
    frameInterval.current = setInterval(() => {
      if (videoRef.current && isActive && onFrame) {
        onFrame(videoRef.current)
      }
    }, 500) // Process every 500ms
  }
  
  return (
    <div className="camera-container relative">
      <video 
        ref={videoRef}
        className="w-full h-full object-cover rounded-md"
        playsInline 
        muted
        autoPlay
        style={style}
      />
      
      {cameraError && (
        <div className="camera-error absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-sm text-center">
          {cameraError}
        </div>
      )}
    </div>
  )
})

export default Camera