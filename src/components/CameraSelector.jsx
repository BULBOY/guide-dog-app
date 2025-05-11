'use client'

import { useState, useEffect } from 'react'

export default function CameraSelector({ 
  availableCameras = [], 
  selectedCamera,
  onCameraSelect,
  onRefreshCameras,
  onUseOBSCamera,
  isVirtualCamera = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Show empty state if no cameras
  if (availableCameras.length === 0) {
    return (
      <div className="camera-selector p-2 bg-gray-100 rounded-md">
        <p className="text-sm">No cameras detected.</p>
        <button 
          className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded-md"
          onClick={onRefreshCameras}
        >
          Refresh Camera List
        </button>
      </div>
    )
  }
  
  // Find the selected camera details
  const currentCamera = availableCameras.find(cam => cam.id === selectedCamera) || availableCameras[0]
  
  return (
    <div className="camera-selector">
      <div className="selected-camera flex items-center justify-between p-2 bg-gray-100 rounded-md">
        <div className="flex items-center">
          <div className={`status-dot ${isVirtualCamera ? 'bg-purple-500' : 'bg-green-500'}`}></div>
          <span className="text-sm font-medium truncate" style={{ maxWidth: '150px' }}>
            {currentCamera?.label || 'Default Camera'}
          </span>
        </div>
        
        <div className="flex">
          {/* OBS specific button */}
          <button
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded-md mr-2"
            onClick={onUseOBSCamera}
            title="Switch to OBS Virtual Camera if available"
          >
            Use OBS
          </button>
          
          {/* Toggle dropdown */}
          <button
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded-md"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? 'Close' : 'Change'}
          </button>
        </div>
      </div>
      
      {/* Camera list dropdown */}
      {isOpen && (
        <div className="camera-list">
          <div className="max-h-40 overflow-y-auto">
            {availableCameras.map(camera => (
              <button
                key={camera.id}
                className={`w-full text-left p-2 rounded-md mb-1 flex items-center ${
                  camera.id === selectedCamera 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  onCameraSelect(camera.id)
                  setIsOpen(false)
                }}
              >
                <div className={`status-dot ${camera.isVirtual ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">{camera.label}</span>
                  <span className="text-xs text-gray-500">
                    {camera.isVirtual ? 'Virtual Camera' : 'Physical Camera'}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-2 flex justify-between items-center">
            <button
              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md"
              onClick={onRefreshCameras}
            >
              Refresh List
            </button>
            
            <span className="text-xs text-gray-500">
              {availableCameras.length} camera{availableCameras.length !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>
      )}
    </div>
  )
}