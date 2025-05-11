/**
 * Enhanced utility for handling text-to-speech functionality
 * with improved handling of announcements
 */

// Track speech state
let isSpeaking = false;
let speechQueue = [];
let speechSynthesisSupported = false;
let lastSpeechTime = 0;
let lastSpeechText = '';

// Initialize speech system
const initSpeech = () => {
  // Check if speech synthesis is supported
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesisSupported = true;
    
    // Handle edge cases where speech synthesis gets stuck
    // Safari and some mobile browsers have issues with this
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, cancel any ongoing speech
        window.speechSynthesis.cancel();
        isSpeaking = false;
        speechQueue = [];
      }
    });
    
    // Process queue periodically
    setInterval(processQueue, 250);
    
    // Periodically check if speech synthesis is stuck
    setInterval(() => {
      if (isSpeaking && Date.now() - lastSpeechTime > 10000) {
        // If speech has been "speaking" for over 10 seconds, reset it
        console.log('Speech appears stuck, resetting...');
        window.speechSynthesis.cancel();
        isSpeaking = false;
        
        // Try to continue queue processing
        setTimeout(processQueue, 500);
      }
    }, 5000);
    
    return true;
  } else {
    console.warn('Speech synthesis not supported in this browser');
    return false;
  }
};

// Process the speech queue
const processQueue = () => {
  if (!speechSynthesisSupported || isSpeaking || speechQueue.length === 0) return;
  
  // Get the next item from the queue
  const nextItem = speechQueue.shift();
  
  // Speak it
  speakImmediate(nextItem.text, nextItem.options);
};

// Speak text immediately (internal use)
const speakImmediate = (text, options = {}) => {
  if (!speechSynthesisSupported) return;
  
  // Update last speech time
  lastSpeechTime = Date.now();
  lastSpeechText = text;
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set options
  utterance.rate = options.rate || 1.1; // Slightly faster than default
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;
  
  // Adjust rate based on priority (urgent messages spoken more slowly and clearly)
  if (options.priority === 'high') {
    utterance.rate = 0.9; // Slower for important messages
    utterance.volume = 1.0; // Full volume
  }
  
  // Use preferred voice if available
  if (options.voice) {
    utterance.voice = options.voice;
  } else {
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en-'));
    if (englishVoices.length > 0) {
      utterance.voice = englishVoices[0];
    }
  }
  
  // Handle events
  isSpeaking = true;
  
  if (options.onStart) {
    options.onStart();
  }
  
  utterance.onend = () => {
    isSpeaking = false;
    
    if (options.onEnd) {
      options.onEnd();
    }
    
    // Process next item in queue after a short delay
    if (speechQueue.length > 0) {
      setTimeout(processQueue, 150); // Small pause between announcements
    }
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
    isSpeaking = false;
    
    if (options.onError) {
      options.onError(event);
    }
    
    // Process next item in queue
    if (speechQueue.length > 0) {
      setTimeout(processQueue, 150);
    }
  };
  
  // Speak
  window.speechSynthesis.speak(utterance);
};

// Public API

/**
 * Speak text with optional options
 * @param {string} text - Text to speak
 * @param {Object} options - Speech options
 * @param {number} options.rate - Speech rate (0.1 to 10, default 1.1)
 * @param {number} options.pitch - Speech pitch (0 to 2, default 1)
 * @param {number} options.volume - Speech volume (0 to 1, default 1)
 * @param {string} options.priority - Priority ('high', 'medium', 'normal', or 'low')
 * @param {SpeechSynthesisVoice} options.voice - Specific voice to use
 * @param {Function} options.onStart - Callback when speech starts
 * @param {Function} options.onEnd - Callback when speech ends
 * @param {Function} options.onError - Callback when speech error occurs
 */
export const speak = (text, options = {}) => {
  if (!speechSynthesisSupported) {
    initSpeech();
    if (!speechSynthesisSupported) return;
  }
  
  // Don't repeat the exact same message if it was just spoken (within 2 seconds)
  if (text === lastSpeechText && Date.now() - lastSpeechTime < 2000) {
    return;
  }
  
  // Clean the text
  const cleanedText = cleanTextForSpeech(text);
  
  // Handle priority
  // 'high' priority interrupts current speech
  // 'medium' is placed at the front of the queue
  // 'normal' is added to the end of the queue
  // 'low' is only added if queue is short or empty
  
  if (options.priority === 'high' && isSpeaking) {
    // Cancel current speech and clear queue for high priority message
    window.speechSynthesis.cancel();
    isSpeaking = false;
    
    // Only keep other high priority messages in the queue
    speechQueue = speechQueue.filter(item => item.options.priority === 'high');
    
    // Add this high priority message to the front
    speechQueue.unshift({
      text: cleanedText,
      options
    });
    
    // Process immediately
    processQueue();
    return;
  }
  
  if (options.priority === 'medium') {
    // Add medium priority to front of queue (after high priority)
    const highPriorityIndex = speechQueue.findIndex(item => item.options.priority !== 'high');
    
    if (highPriorityIndex === -1) {
      // No high priority items, add to front
      speechQueue.unshift({
        text: cleanedText,
        options
      });
    } else {
      // Insert after high priority items
      speechQueue.splice(highPriorityIndex, 0, {
        text: cleanedText,
        options
      });
    }
    
    // Start processing if not already speaking
    if (!isSpeaking) {
      processQueue();
    }
    return;
  }
  
  if (options.priority === 'low') {
    // Only add low priority if queue is short
    if (speechQueue.length <= 2) {
      speechQueue.push({
        text: cleanedText,
        options
      });
      
      // Start processing if not already speaking
      if (!isSpeaking) {
        processQueue();
      }
    }
    return;
  }
  
  // Normal priority - add to queue
  speechQueue.push({
    text: cleanedText,
    options
  });
  
  // Start processing if not already speaking
  if (!isSpeaking) {
    processQueue();
  }
};

/**
 * Stop any ongoing speech and clear the queue
 */
export const stopSpeaking = () => {
  if (!speechSynthesisSupported) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Clear queue
  speechQueue = [];
  isSpeaking = false;
};

/**
 * Check if speech is currently active
 * @returns {boolean} True if speaking
 */
export const checkSpeaking = () => {
  return isSpeaking;
};

/**
 * Get all available voices
 * @returns {SpeechSynthesisVoice[]} Array of available voices
 */
export const getVoices = () => {
  if (!speechSynthesisSupported) return [];
  
  return window.speechSynthesis.getVoices();
};

/**
 * Find the best voice for accessibility
 * @returns {SpeechSynthesisVoice|null} Best voice or null if none found
 */
export const findAccessibleVoice = () => {
  if (!speechSynthesisSupported) return null;
  
  const voices = window.speechSynthesis.getVoices();
  
  // First try to find voices with accessibility features
  const accessibilityVoices = voices.filter(voice => 
    voice.name.toLowerCase().includes('enhanced') || 
    voice.name.toLowerCase().includes('premium') ||
    voice.name.toLowerCase().includes('accessibility')
  );
  
  if (accessibilityVoices.length > 0) {
    return accessibilityVoices[0];
  }
  
  // Then try to find English voices
  const englishVoices = voices.filter(voice => 
    voice.lang.startsWith('en-')
  );
  
  if (englishVoices.length > 0) {
    return englishVoices[0];
  }
  
  // Fallback to any voice
  if (voices.length > 0) {
    return voices[0];
  }
  
  return null;
};

/**
 * Clean text for better speech quality
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
const cleanTextForSpeech = (text) => {
  if (!text) return '';
  
  let cleaned = text.toString().trim();
  
  // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Common abbreviations
  cleaned = cleaned.replace(/St\./g, 'Street');
  cleaned = cleaned.replace(/Ave\./g, 'Avenue');
  cleaned = cleaned.replace(/Rd\./g, 'Road');
  
  // Add slight pauses for better phrasing using SSML-like syntax
  cleaned = cleaned.replace(/\./g, '. ');
  cleaned = cleaned.replace(/,/g, ', ');
  
  // Direction terms - add emphasis
  cleaned = cleaned.replace(/\bleft\b/gi, 'left');
  cleaned = cleaned.replace(/\bright\b/gi, 'right');
  cleaned = cleaned.replace(/\bahead\b/gi, 'ahead');
  
  // Distance formatting
  cleaned = cleaned.replace(/(\d+\.\d+)\s*meters/g, '$1 meters');
  
  // Enhance warning phrases
  cleaned = cleaned.replace(/warning/gi, 'Warning: ');
  
  return cleaned;
};

/**
 * Speak a distance-based notification with appropriate urgency
 * @param {string} objectName - Name of the object
 * @param {string} position - Position (left, right, ahead)
 * @param {number} distance - Distance in meters
 * @param {Object} options - Additional options
 */
export const speakDistanceNotification = (objectName, position, distance, options = {}) => {
  // Create message with appropriate urgency based on distance
  let message = '';
  let priority = 'normal';
  
  if (distance < 1.5) {
    // Very close - urgent warning
    message = `Warning: ${objectName} ${position}, ${distance.toFixed(1)} meters`;
    priority = 'high';
  } else if (distance < 3) {
    // Close - medium warning
    message = `${objectName} ${position}, ${distance.toFixed(1)} meters`;
    priority = 'medium';
  } else {
    // Further away - informational
    message = `${objectName} ${position}, ${distance.toFixed(1)} meters`;
    priority = 'low';
  }
  
  // Speak with appropriate priority
  speak(message, { ...options, priority });
};

/**
 * Announce a new object with appropriate details
 * @param {Object} object - Detected object with label, position, distance
 * @param {Object} options - Additional options
 */
export const announceNewObject = (object, options = {}) => {
  const { label, position, distance } = object;
  
  let message = `New ${label} detected ${position}, ${distance.toFixed(1)} meters away`;
  let priority = distance < 3 ? 'medium' : 'low';
  
  speak(message, { ...options, priority });
};

// Initialize on load
if (typeof window !== 'undefined') {
  initSpeech();
}

// Export as an object
export default {
  speak,
  stopSpeaking,
  isSpeaking: checkSpeaking,
  getVoices,
  findAccessibleVoice,
  speakDistanceNotification,
  announceNewObject
};