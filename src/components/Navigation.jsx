'use client'

import { useState, useEffect, useRef } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as cocossd from '@tensorflow-models/coco-ssd'
import Camera from './Camera'
import CameraSelector from './CameraSelector'
import ObjectDisplay from './ObjectDisplay'
import { speak, stopSpeaking, speakDistanceNotification, announceNewObject } from '@/utils/speech'
import { useCamera } from '@/hooks/useCamera'

export default function Navigation() {
  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectionHistoryRef = useRef({}) // Store object detection history
  const lastAnnouncementRef = useRef({}) // Track last announcement time for each object
  const announceAllTimeoutRef = useRef(null) // For delaying the announce all function
  
  // State
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [detectedObjects, setDetectedObjects] = useState([])
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [model, setModel] = useState(null)
  const [lastProcessTime, setLastProcessTime] = useState(0)
  const [verbosityLevel, setVerbosityLevel] = useState('medium') // 'low', 'medium', 'high'
  const [announceAllMode, setAnnounceAllMode] = useState(true) // Whether to announce all objects
  
  // Camera hooks
  const {
    availableCameras,
    selectedCamera,
    selectCamera,
    refreshCameraList,
    useOBSCamera,
    isVirtualCamera
  } = useCamera()
  
  // Load TensorFlow model on component mount
  useEffect(() => {
    async function loadModel() {
      try {
        // Initialize TensorFlow.js
        await tf.ready()
        console.log('TensorFlow.js loaded')
        
        // Load COCO-SSD model
        const loadedModel = await cocossd.load({
          base: 'mobilenet_v2'
        })
        console.log('COCO-SSD model loaded')
        
        setModel(loadedModel)
        setIsModelLoaded(true)
        
        // Announce model loaded
        speak('Model loaded. Ready to start navigation.')
      } catch (error) {
        console.error('Failed to load model:', error)
        speak('Error loading detection model. Please refresh the app.')
      }
    }
    
    loadModel()
    
    // Cleanup
    return () => {
      stopNavigation()
      if (announceAllTimeoutRef.current) {
        clearTimeout(announceAllTimeoutRef.current)
      }
    }
  }, [])
  
  // Start camera and navigation
  const startNavigation = async () => {
    if (!isModelLoaded) {
      speak('Please wait, model is still loading.')
      return
    }
    
    setIsNavigating(true)
    speak('Navigation started. Processing camera feed.')

    // Clear previous detection history when starting new session
    detectionHistoryRef.current = {}
    lastAnnouncementRef.current = {}
  }
  
  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false)
    setDetectedObjects([])
    speak('Navigation stopped.')
    
    if (announceAllTimeoutRef.current) {
      clearTimeout(announceAllTimeoutRef.current)
    }
  }
  
  // Process video frame
  const processFrame = async (videoElement) => {
    if (!videoElement || !model || !isNavigating) return
    
    // Limit processing rate (process every 500ms)
    const currentTime = Date.now()
    if (currentTime - lastProcessTime < 500) return
    setLastProcessTime(currentTime)
    
    try {
      // Run detection on video frame
      const predictions = await model.detect(videoElement)
      
      // Process predictions
      const processedObjects = predictions
        .filter(pred => pred.score > 0.60) // Only high confidence detections
        .map(pred => {
          const { bbox, class: label, score } = pred
          const [x, y, width, height] = bbox
          
          // Calculate object center position
          const objectCenterX = x + width / 2
          
          // Determine position relative to frame center
          const frameWidth = videoElement.videoWidth
          const frameCenter = frameWidth / 2
          const position = objectCenterX < frameCenter * 0.7 ? 'left' : 
                          objectCenterX > frameCenter * 1.3 ? 'right' : 'ahead'
          
          // Estimate distance based on object size
          // This is a simple heuristic - real distance estimation requires depth sensing
          const objectSize = width * height
          const frameSize = frameWidth * videoElement.videoHeight
          const sizeRatio = objectSize / frameSize
          const estimatedDistance = 0.8 / Math.sqrt(sizeRatio)
          
          return {
            label,
            confidence: score,
            boundingBox: { x, y, width, height },
            position,
            distance: estimatedDistance,
            id: `${label}-${position}-${Math.floor(estimatedDistance)}`, // Create ID for tracking
            timestamp: currentTime
          }
        })
      
      // Update state with new detections
      setDetectedObjects(processedObjects)
      
      // Draw on canvas if in high contrast mode
      if (highContrastMode && canvasRef.current) {
        drawDetections(processedObjects, videoElement)
      }
      
      // Update detection history and identify new objects
      const newObjects = updateDetectionHistory(processedObjects, currentTime)
      
      // If in announce all mode and we have objects, schedule announcements
      if (announceAllMode && processedObjects.length > 0) {
        if (announceAllTimeoutRef.current) {
          clearTimeout(announceAllTimeoutRef.current)
        }
        
        // Don't announce all objects immediately after new objects are detected
        // This avoids overwhelming the user with too many announcements at once
        if (newObjects.length === 0) {
          announceAllTimeoutRef.current = setTimeout(() => {
            announceAllObjects(processedObjects, currentTime)
          }, 2000) // Wait 2 seconds before announcing all objects
        } else {
          // Announce new objects immediately
          announceNewObjects(newObjects)
        }
      } else {
        // If not in announce all mode, just report the closest obstacle
        reportClosestObstacle(processedObjects, currentTime)
      }
    } catch (error) {
      console.error('Error in object detection:', error)
    }
  }
  
  // Update detection history and identify new objects
  const updateDetectionHistory = (objects, currentTime) => {
    const history = detectionHistoryRef.current
    const newObjectsDetected = []
    
    // Track current detections to later identify disappeared objects
    const currentIds = new Set()
    
    // Process each detected object
    objects.forEach(obj => {
      currentIds.add(obj.id)
      
      // Check if this is a new object
      if (!history[obj.id]) {
        // New object detected
        history[obj.id] = {
          firstSeen: currentTime,
          lastSeen: currentTime,
          label: obj.label,
          position: obj.position,
          distance: obj.distance,
          announceCount: 0
        }
        
        // Add to new objects list if it's close enough to care about
        if (obj.distance < 8) {
          newObjectsDetected.push(obj)
        }
      } else {
        // Existing object - update last seen time
        const existingObj = history[obj.id]
        
        // Update history
        existingObj.lastSeen = currentTime
        existingObj.position = obj.position
        existingObj.distance = obj.distance
      }
    })
    
    // Check for objects that disappeared
    Object.keys(history).forEach(id => {
      const obj = history[id]
      
      // If object not in current detections and was seen recently (within 2 seconds)
      if (!currentIds.has(id) && currentTime - obj.lastSeen < 2000) {
        // Object just disappeared
        delete history[id]
        
        // Announce if it was important and close
        if (obj.distance < 3 && speechEnabled && verbosityLevel !== 'low') {
          // Only announce if it's been at least 3 seconds since detection
          if (currentTime - obj.firstSeen > 3000) {
            speak(`${obj.label} no longer detected`, { priority: 'low' })
          }
        }
      }
      // Clean up old history items (older than 30 seconds)
      else if (currentTime - obj.lastSeen > 30000) {
        delete history[id]
      }
    })
    
    return newObjectsDetected
  }
  
  // Announce new objects that appeared in the scene
  const announceNewObjects = (newObjects) => {
    if (!speechEnabled || newObjects.length === 0) return
    
    // Sort new objects by distance - closest first
    newObjects.sort((a, b) => a.distance - b.distance)
    
    // If there are many new objects, only announce the closest few to avoid overwhelming
    const objectsToAnnounce = newObjects.length <= 3 ? 
                             newObjects : 
                             newObjects.slice(0, 3)
    
    // Announce each new object with short delay between announcements
    objectsToAnnounce.forEach((obj, index) => {
      setTimeout(() => {
        announceNewObject(obj)
        
        // If this is the last object and there are more not announced, mention the count
        if (index === objectsToAnnounce.length - 1 && newObjects.length > objectsToAnnounce.length) {
          const remainingCount = newObjects.length - objectsToAnnounce.length
          speak(`And ${remainingCount} more new object${remainingCount > 1 ? 's' : ''}`, { priority: 'low' })
        }
      }, index * 1500) // 1.5 second delay between announcements
    })
  }
  
  // Announce all currently detected objects
  const announceAllObjects = (objects, currentTime) => {
    if (!speechEnabled || objects.length === 0) return
    
    // Sort objects by distance - closest first
    const sorted = [...objects].sort((a, b) => a.distance - b.distance)
    
    // Determine how many objects to announce based on verbosity
    let objectCount = 0
    switch (verbosityLevel) {
      case 'low':
        objectCount = Math.min(2, sorted.length)
        break
      case 'medium':
        objectCount = Math.min(4, sorted.length)
        break
      case 'high':
        objectCount = sorted.length
        break
      default:
        objectCount = Math.min(3, sorted.length)
    }
    
    // Take the subset of objects to announce
    const objectsToAnnounce = sorted.slice(0, objectCount)
    
    // First, announce how many objects were detected
    const totalCount = objects.length
    speak(`${totalCount} object${totalCount !== 1 ? 's' : ''} detected.`, { priority: 'medium' })
    
    // Then announce each object with a delay between them
    objectsToAnnounce.forEach((obj, index) => {
      // Check if this object was recently announced
      const lastAnnounceTime = lastAnnouncementRef.current[obj.id] || 0
      
      // Update the last announcement time
      lastAnnouncementRef.current[obj.id] = currentTime
      
      // Announce after a delay based on position in the list
      setTimeout(() => {
        // Create message with position and distance
        const message = `${obj.label} ${obj.position}, ${obj.distance.toFixed(1)} meters`
        
        // Determine priority based on distance
        let priority = 'normal'
        if (obj.distance < 1.5) priority = 'high'
        else if (obj.distance < 3) priority = 'medium'
        else priority = 'low'
        
        speak(message, { priority })
      }, 1200 + index * 1500) // Starting delay + 1.5 second between each announcement
    })
    
    // If there are more objects not announced, mention the count
    if (objectCount < sorted.length) {
      const remainingCount = sorted.length - objectCount
      setTimeout(() => {
        speak(`And ${remainingCount} more object${remainingCount > 1 ? 's' : ''} further away`, { priority: 'low' })
      }, 1200 + objectCount * 1500) // After all other announcements
    }
  }
  
  // Report only the closest obstacle (used when not in announce all mode)
  const reportClosestObstacle = (objects, currentTime) => {
    if (!speechEnabled || objects.length === 0) return
    
    // Find closest obstacle
    const sorted = [...objects].sort((a, b) => a.distance - b.distance)
    const closest = sorted[0]
    
    // Define distance thresholds
    const immediateWarningThreshold = 1.5  // Very close - immediate warning
    const warningThreshold = 3.0           // Close - warning
    const noticeThreshold = 5.0            // Moderate distance - notice
    
    // Only report if object is within warning distance
    if (closest.distance < noticeThreshold) {
      // Check when this object was last announced
      const lastAnnounceTime = lastAnnouncementRef.current[closest.id] || 0
      const timeSinceLastAnnounce = currentTime - lastAnnounceTime
      
      // Determine announcement frequency based on distance and verbosity
      let shouldAnnounce = false
      
      if (closest.distance < immediateWarningThreshold) {
        // Very close objects - announce frequently
        shouldAnnounce = timeSinceLastAnnounce > (verbosityLevel === 'high' ? 2000 : 3000)
      } else if (closest.distance < warningThreshold) {
        // Close objects - announce occasionally
        shouldAnnounce = timeSinceLastAnnounce > (verbosityLevel === 'high' ? 4000 : 6000)
      } else if (verbosityLevel !== 'low') {
        // Further objects - announce rarely and only if verbosity is medium or high
        shouldAnnounce = timeSinceLastAnnounce > 10000
      }
      
      if (shouldAnnounce) {
        // Use the utility function for consistent announcements
        speakDistanceNotification(closest.label, closest.position, closest.distance)
        
        // Update last announcement time
        lastAnnouncementRef.current[closest.id] = currentTime
      }
    }
  }
  
  // Draw detections on canvas
  const drawDetections = (objects, videoElement) => {
    if (!canvasRef.current || !videoElement) return
    
    const ctx = canvasRef.current.getContext('2d')
    
    // Set canvas dimensions to match video
    canvasRef.current.width = videoElement.videoWidth
    canvasRef.current.height = videoElement.videoHeight
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    
    // Draw each detection
    objects.forEach(obj => {
      const { x, y, width, height } = obj.boundingBox
      
      // Choose color based on distance
      let color = 'yellow'
      if (obj.distance < 2) color = 'red'
      else if (obj.distance < 4) color = 'orange'
      
      // Draw outer frame (shadow effect)
      ctx.lineWidth = 8
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
      
      // Draw main colored box
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.strokeRect(x, y, width, height)
      
      // Add a semi-transparent background for the text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      const textY = y > 30 ? y - 10 : y + height + 25
      ctx.fillRect(x, textY - 18, width, 24)
      
      // Draw label
      ctx.fillStyle = color
      ctx.font = 'bold 16px Arial'
      ctx.fillText(
        `${obj.label} (${obj.distance.toFixed(1)}m)`,
        x + 4, 
        textY
      )
      
      // Draw position arrow
      const arrowSize = 24
      const arrowX = x + width / 2 - arrowSize / 2
      const arrowY = y + height + 5
      
      ctx.fillStyle = color
      ctx.font = `bold ${arrowSize}px Arial`
      
      // Draw different arrows based on position
      let arrow = '↑'
      if (obj.position === 'left') arrow = '←'
      if (obj.position === 'right') arrow = '→'
      
      // Only draw arrow if there's enough room below the object
      if (arrowY + arrowSize < ctx.canvas.height - 10) {
        ctx.fillText(arrow, arrowX, arrowY + arrowSize)
      }
    })
  }
  
  // Manually trigger announcement of all objects
  const manuallyDescribeSurroundings = () => {
    if (detectedObjects.length === 0) {
      speak('No objects detected in view')
      return
    }
    
    // Force announcement of all objects immediately
    announceAllObjects(detectedObjects, Date.now())
  }
  
  // Toggle speech feedback
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled)
    speak(speechEnabled ? 'Speech disabled' : 'Speech enabled')
  }
  
  // Toggle high contrast mode
  const toggleHighContrast = () => {
    setHighContrastMode(!highContrastMode)
    speak(highContrastMode ? 'High contrast mode disabled' : 'High contrast mode enabled')
  }
  
  // Toggle announce all mode
  const toggleAnnounceAll = () => {
    setAnnounceAllMode(!announceAllMode)
    speak(announceAllMode ? 'Switched to closest object only mode' : 'Switched to announce all objects mode')
  }
  
  // Change verbosity level
  const cycleVerbosity = () => {
    const levels = ['low', 'medium', 'high']
    const currentIndex = levels.indexOf(verbosityLevel)
    const nextIndex = (currentIndex + 1) % levels.length
    const newLevel = levels[nextIndex]
    
    setVerbosityLevel(newLevel)
    speak(`Verbosity level set to ${newLevel}`)
  }
  
  // CSS class for verbosity button
  const getVerbosityButtonClass = () => {
    if (verbosityLevel === 'low') return 'bg-gray-600';
    if (verbosityLevel === 'medium') return 'bg-blue-600';
    return 'bg-purple-600';
  }
  
  return (
    <div className={`navigation-container ${highContrastMode ? 'high-contrast-mode' : ''}`}>
      {/* Status indicator */}
      <div className="status">
        {!isModelLoaded ? 'Loading model...' : isNavigating ? 'Navigating' : 'Ready'}
      </div>
      
      {/* Camera selector */}
      <div className="mb-2">
        <CameraSelector
          availableCameras={availableCameras}
          selectedCamera={selectedCamera}
          onCameraSelect={(cameraId) => {
            selectCamera(cameraId, videoRef.current)
          }}
          onRefreshCameras={async () => {
            await refreshCameraList()
            speak('Camera list refreshed')
          }}
          onUseOBSCamera={async () => {
            const success = await useOBSCamera(videoRef.current)
            if (success) {
              speak('Switched to OBS Virtual Camera')
            } else {
              speak('OBS Virtual Camera not found. Please start OBS and enable Virtual Camera.')
            }
          }}
          isVirtualCamera={isVirtualCamera}
        />
      </div>
      
      {/* Camera view */}
      <div className="relative overflow-hidden bg-black rounded-md">
        <Camera 
          ref={videoRef} 
          isActive={isNavigating} 
          onFrame={processFrame}
          style={{ display: highContrastMode ? 'none' : 'block' }}
          selectedCamera={selectedCamera}
          detectedObjects={detectedObjects} // Pass detected objects for framing
        />
        
        <canvas 
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ display: highContrastMode ? 'block' : 'none' }}
        />
      </div>
      
      {/* Control buttons */}
      <div className="controls p-4 space-y-2">
        {!isNavigating ? (
          <button 
            className="w-full p-4 bg-green-600 text-white text-xl rounded-lg"
            onClick={startNavigation}
            disabled={!isModelLoaded}
          >
            Start Navigation
          </button>
        ) : (
          <button 
            className="w-full p-4 bg-red-600 text-white text-xl rounded-lg"
            onClick={stopNavigation}
          >
            Stop Navigation
          </button>
        )}
        
        <button 
          className="w-full p-4 bg-blue-600 text-white text-xl rounded-lg"
          onClick={manuallyDescribeSurroundings}
          disabled={!isNavigating}
        >
          Describe All Objects
        </button>
        
        <div className="flex space-x-2">
          <button 
            className={`flex-1 p-4 ${speechEnabled ? 'bg-purple-600' : 'bg-gray-600'} text-white rounded-lg`}
            onClick={toggleSpeech}
          >
            {speechEnabled ? 'Mute' : 'Unmute'}
          </button>
          
          <button 
            className={`flex-1 p-4 ${highContrastMode ? 'bg-yellow-600' : 'bg-gray-600'} text-white rounded-lg`}
            onClick={toggleHighContrast}
            disabled={!isNavigating}
          >
            {highContrastMode ? 'Normal View' : 'High Contrast'}
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button 
            className={`flex-1 p-3 ${getVerbosityButtonClass()} text-white rounded-lg`}
            onClick={cycleVerbosity}
          >
            Verbosity: {verbosityLevel.charAt(0).toUpperCase() + verbosityLevel.slice(1)}
          </button>
          
          <button 
            className={`flex-1 p-3 ${announceAllMode ? 'bg-green-600' : 'bg-gray-600'} text-white rounded-lg`}
            onClick={toggleAnnounceAll}
          >
            {announceAllMode ? 'All Objects' : 'Closest Only'}
          </button>
        </div>
      </div>
      
      {/* Object list with visual indicators */}
      {isNavigating && detectedObjects.length > 0 && (
        <div className="mt-4">
          <ObjectDisplay 
            objects={detectedObjects} 
            highContrastMode={highContrastMode}
          />
        </div>
      )}
    </div>
  )
}