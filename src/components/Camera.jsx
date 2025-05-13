'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useCamera } from '@/hooks/useCamera'

const Camera = forwardRef(function Camera({ 
  isActive, 
  onFrame, 
  style,
  selectedCamera,
  detectedObjects = []
}, ref) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const frameInterval = useRef(null)
  const { startCamera, stopCamera } = useCamera()
  const [cameraError, setCameraError] = useState(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  
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
  
  // Handle video metadata loaded - get actual video dimensions
  const updateVideoDimensions = () => {
    if (!videoRef.current) return
    
    setVideoDimensions({
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight
    })
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
  
  // Calculate dimensions for object frames
  const calculateFramePosition = (boundingBox) => {
    if (!videoRef.current || !videoDimensions.width) return null
    
    const { x, y, width, height } = boundingBox
    
    // Calculate scale factor between original video dimensions and displayed size
    const scaleX = videoRef.current.offsetWidth / videoDimensions.width
    const scaleY = videoRef.current.offsetHeight / videoDimensions.height
    
    // Scale the bounding box
    return {
      left: `${x * scaleX}px`,
      top: `${y * scaleY}px`,
      width: `${width * scaleX}px`,
      height: `${height * scaleY}px`
    }
  }
  
  // Determine frame color based on distance
  const getFrameColor = (distance) => {
    if (distance < 1.5) return '#dc2626' // red
    if (distance < 3) return '#ea580c'    // orange
    if (distance < 5) return '#ca8a04'    // yellow
    return '#10b981'                      // green
  }
  
  // Get animation class based on distance
  const getAnimationClass = (distance) => {
    return distance < 1.5 ? 'pulse-animation' : ''
  }
  
  return (
    <div className="camera-container relative" ref={containerRef}>
      <video 
        ref={videoRef}
        className="w-full h-full object-cover rounded-md"
        playsInline 
        muted
        autoPlay
        style={style}
        onLoadedMetadata={updateVideoDimensions}
      />
      
      {/* Object frame overlays - directly on the camera display */}
      {!style || style.display !== 'none' ? detectedObjects.map((obj, index) => {
        const frameStyle = calculateFramePosition(obj.boundingBox)
        if (!frameStyle) return null
        
        const { label, position, distance } = obj
        const borderColor = getFrameColor(distance)
        
        return (
          <div
            key={`frame-${index}`}
            className={`canvas-highlight ${getAnimationClass(distance)}`}
            style={{
              ...frameStyle,
              borderColor: borderColor,
              borderStyle: distance < 3 ? 'solid' : 'dashed',
              borderWidth: distance < 1.5 ? '4px' : '2px'
            }}
          >
            {/* Object label */}
            <div className="object-label" style={{ color: borderColor }}>
              {label} ({distance.toFixed(1)}m)
            </div>
            
            {/* Position indicator */}
            <div className="position-indicator" style={{ color: borderColor }}>
              {position === 'left' ? '←' : position === 'right' ? '→' : '↑'}
            </div>
          </div>
        )
      }) : null}
      
      {cameraError && (
        <div className="camera-error absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-sm text-center">
          {cameraError}
        </div>
      )}
    </div>
  )
})

export default Camera