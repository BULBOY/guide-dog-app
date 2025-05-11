'use client'

import React from 'react'

/**
 * Component to display detected objects and their distances visually
 */
export default function ObjectDisplay({ objects = [], highContrastMode = false }) {
  if (!objects || objects.length === 0) {
    return (
      <div className={`object-display p-3 rounded-lg text-center ${highContrastMode ? 'bg-black text-white' : 'bg-gray-100'}`}>
        No objects detected
      </div>
    )
  }
  
  // Sort objects by distance (closest first)
  const sortedObjects = [...objects].sort((a, b) => a.distance - b.distance)
  
  return (
    <div className={`object-display p-3 rounded-lg ${highContrastMode ? 'bg-black text-white' : 'bg-gray-100'}`}>
      <h3 className="font-bold text-lg mb-2">Detected Objects</h3>
      
      <div className="object-list space-y-2">
        {sortedObjects.map((obj, index) => (
          <ObjectItem 
            key={index} 
            object={obj} 
            highContrastMode={highContrastMode}
            isClosest={index === 0}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual object item with distance visualization
 */
function ObjectItem({ object, highContrastMode, isClosest }) {
  const { label, position, distance } = object
  
  // Determine color based on distance
  const getColor = () => {
    if (distance < 1.5) return highContrastMode ? 'text-red-400' : 'text-red-600'
    if (distance < 3) return highContrastMode ? 'text-orange-400' : 'text-orange-600'
    if (distance < 5) return highContrastMode ? 'text-yellow-400' : 'text-yellow-600'
    return highContrastMode ? 'text-green-400' : 'text-green-600'
  }
  
  // Calculate width of distance bar (max 100%, min 5%)
  const getBarWidth = () => {
    // Inverse relationship - closer objects have larger bars
    const percent = Math.max(5, Math.min(100, 100 * (1 - (distance / 10))))
    return `${percent}%`
  }
  
  // Format position into an arrow
  const getPositionArrow = () => {
    switch (position) {
      case 'left': return '←'
      case 'right': return '→'
      case 'ahead': return '↑'
      default: return '•'
    }
  }
  
  return (
    <div className={`object-item p-2 rounded ${isClosest ? (highContrastMode ? 'bg-gray-800' : 'bg-blue-100') : ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-2xl mr-2" aria-hidden="true">{getPositionArrow()}</span>
          <span className="font-medium">{label}</span>
        </div>
        <span className={`${getColor()} font-bold`}>
          {distance.toFixed(1)}m
        </span>
      </div>
      
      {/* Distance visualization bar */}
      <div 
        className={`mt-1 h-2 rounded-full ${highContrastMode ? 'bg-gray-700' : 'bg-gray-200'}`}
        role="presentation"
      >
        <div 
          className={`h-full rounded-full ${getColor().replace('text-', 'bg-')}`}
          style={{ width: getBarWidth() }}
        ></div>
      </div>
    </div>
  )
}