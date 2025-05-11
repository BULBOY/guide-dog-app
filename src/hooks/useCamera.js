import { useState, useEffect, useCallback } from 'react'

/**
 * Enhanced camera hook with OBS Virtual Camera support
 */
export function useCamera() {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' for back camera, 'user' for front
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [isVirtualCamera, setIsVirtualCamera] = useState(false)

  // Find all available video input devices
  const getAvailableCameras = useCallback(async () => {
    try {
      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      // Filter for video input devices
      const cameras = devices.filter(device => device.kind === 'videoinput')
      
      // Format camera list with useful information
      const formattedCameras = cameras.map(camera => {
        const isVirtual = 
          camera.label.toLowerCase().includes('obs') || 
          camera.label.toLowerCase().includes('virtual') ||
          camera.label.toLowerCase().includes('capture')
        
        return {
          id: camera.deviceId,
          label: camera.label || `Camera ${camera.deviceId.substring(0, 5)}...`,
          isVirtual: isVirtual
        }
      })
      
      setAvailableCameras(formattedCameras)
      
      // Automatically select OBS/Virtual camera if available and user hasn't made a choice
      if (!selectedCamera && formattedCameras.length > 0) {
        // Find virtual camera first
        const virtualCamera = formattedCameras.find(cam => cam.isVirtual)
        
        if (virtualCamera) {
          console.log('Found virtual camera:', virtualCamera.label)
          setSelectedCamera(virtualCamera.id)
          setIsVirtualCamera(true)
        } else {
          // Default to first camera
          setSelectedCamera(formattedCameras[0].id)
          setIsVirtualCamera(false)
        }
      }
      
      return formattedCameras
    } catch (error) {
      console.error('Error getting camera list:', error)
      return []
    }
  }, [selectedCamera])

  // Load camera list on component mount
  useEffect(() => {
    getAvailableCameras()
    
    // Set up device change listener to catch when OBS Virtual Camera becomes available
    navigator.mediaDevices.addEventListener('devicechange', () => {
      getAvailableCameras()
    })
    
    return () => {
      // Clean up listener
      navigator.mediaDevices.removeEventListener('devicechange', getAvailableCameras)
    }
  }, [getAvailableCameras])

  /**
   * Start the camera with specified options
   */
  const startCamera = useCallback(async (videoElement) => {
    try {
      // Clear previous errors
      setError(null)
      
      // Prepare constraints
      let constraints = {}
      
      // If a specific camera ID is selected, use that
      if (selectedCamera) {
        constraints = {
          video: {
            deviceId: { exact: selectedCamera }
          },
          audio: false
        }
        
        console.log(`Using selected camera: ${selectedCamera}`)
      } else {
        // Fallback to default camera settings
        constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false
        }
        
        console.log(`Using default camera with facing mode: ${facingMode}`)
      }
      
      // Request camera access
      console.log('Requesting camera access...')
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Get tracks info
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        console.log('Camera settings:', settings)
        
        // Check if this might be OBS based on label
        const isVirtual = 
          videoTrack.label.toLowerCase().includes('obs') || 
          videoTrack.label.toLowerCase().includes('virtual') ||
          videoTrack.label.toLowerCase().includes('capture')
        
        setIsVirtualCamera(isVirtual)
        
        if (isVirtual) {
          console.log('Using virtual camera:', videoTrack.label)
        }
      }
      
      // Set stream to state
      setStream(mediaStream)
      
      // Connect stream to video element if provided
      if (videoElement) {
        videoElement.srcObject = mediaStream
      }
      
      // Wait for camera to be ready
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mark camera as ready
      setIsCameraReady(true)
      console.log('Camera ready')
      
      return true
    } catch (err) {
      // Handle specific errors
      let errorMessage = 'Camera access failed'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please grant permission to use the camera.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      } else if (err.name === 'OverconstrainedError' && selectedCamera) {
        // If we failed with selected camera, try default
        setSelectedCamera(null)
        console.log('Selected camera failed, trying default...')
        return startCamera(videoElement)
      } else {
        errorMessage = `Camera error: ${err.message}`
      }
      
      // Update error state
      setError(errorMessage)
      setIsCameraReady(false)
      
      console.error('Camera access error:', err)
      return false
    }
  }, [facingMode, selectedCamera])
  
  /**
   * Stop the camera and release resources
   */
  const stopCamera = useCallback(() => {
    if (!stream) return
    
    // Stop all tracks
    stream.getTracks().forEach((track) => {
      track.stop()
    })
    
    // Reset state
    setStream(null)
    setIsCameraReady(false)
    console.log('Camera stopped')
  }, [stream])
  
  /**
   * Select a specific camera by ID
   */
  const selectCamera = useCallback(async (cameraId, videoElement) => {
    // Stop current camera if running
    if (stream) {
      stopCamera()
    }
    
    // Set the selected camera
    setSelectedCamera(cameraId)
    
    // Check if this is a virtual camera
    const camera = availableCameras.find(cam => cam.id === cameraId)
    if (camera) {
      setIsVirtualCamera(camera.isVirtual)
    }
    
    // Start camera with new selection if videoElement provided
    if (videoElement) {
      return await startCamera(videoElement)
    }
    
    return true
  }, [availableCameras, startCamera, stopCamera, stream])
  
  /**
   * Refresh the camera list and attempt to find OBS Virtual Camera
   */
  const refreshCameraList = useCallback(async () => {
    const cameras = await getAvailableCameras()
    
    // Look for OBS Virtual Camera
    const obsCamera = cameras.find(cam => 
      cam.label.toLowerCase().includes('obs') || 
      cam.label.toLowerCase().includes('virtual camera')
    )
    
    if (obsCamera) {
      console.log('Found OBS Virtual Camera:', obsCamera.label)
      return obsCamera
    }
    
    return null
  }, [getAvailableCameras])
  
  /**
   * Attempt to use OBS Virtual Camera
   */
  const useOBSCamera = useCallback(async (videoElement) => {
    // Refresh camera list to ensure we have the latest
    await refreshCameraList()
    
    // Find OBS or Virtual Camera
    const virtualCamera = availableCameras.find(cam => cam.isVirtual)
    
    if (virtualCamera) {
      console.log('Switching to virtual camera:', virtualCamera.label)
      return await selectCamera(virtualCamera.id, videoElement)
    } else {
      console.warn('No virtual camera found')
      setError('No OBS Virtual Camera detected. Please start OBS and enable Virtual Camera.')
      return false
    }
  }, [availableCameras, refreshCameraList, selectCamera])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
    }
  }, [stream])
  
  // Return the hook API
  return {
    stream,
    error,
    isCameraReady,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera: (videoElement) => {
      const newMode = facingMode === 'environment' ? 'user' : 'environment'
      setFacingMode(newMode)
      return startCamera(videoElement)
    },
    availableCameras,
    selectedCamera,
    selectCamera,
    refreshCameraList,
    useOBSCamera,
    isVirtualCamera
  }
}

export default useCamera