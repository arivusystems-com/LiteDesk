/**
 * GEO Validation Service
 * Handles GPS validation, radius checking, and auto-pause logic for events
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate if user is within required radius of event location
 * @param {Object} eventLocation - Event's target location {latitude, longitude, radius}
 * @param {Object} userLocation - User's current location {latitude, longitude, accuracy}
 * @returns {Object} {isValid: boolean, distance: number, message: string}
 */
function validateLocation(eventLocation, userLocation) {
  if (!eventLocation || !eventLocation.latitude || !eventLocation.longitude) {
    return {
      isValid: false,
      distance: null,
      message: 'Event location not configured'
    };
  }
  
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return {
      isValid: false,
      distance: null,
      message: 'User location not available'
    };
  }
  
  const radius = eventLocation.radius || 100; // Default 100m
  const distance = calculateDistance(
    eventLocation.latitude,
    eventLocation.longitude,
    userLocation.latitude,
    userLocation.longitude
  );
  
  // Check GPS accuracy - if accuracy is poor, warn but allow if within radius
  const accuracy = userLocation.accuracy || 0;
  const isWithinRadius = distance <= (radius + accuracy); // Add accuracy buffer
  
  let message = '';
  if (!isWithinRadius) {
    message = `You are ${Math.round(distance)}m away. Required: within ${radius}m`;
  } else if (accuracy > 50) {
    message = `Warning: GPS accuracy is low (${Math.round(accuracy)}m). Please ensure you are at the correct location.`;
  } else {
    message = `Location verified. Distance: ${Math.round(distance)}m`;
  }
  
  return {
    isValid: isWithinRadius,
    distance: Math.round(distance),
    message,
    accuracy
  };
}

/**
 * Check if GPS accuracy is acceptable
 * @param {number} accuracy - GPS accuracy in meters
 * @returns {Object} {acceptable: boolean, warning: boolean, message: string}
 */
function checkAccuracy(accuracy) {
  if (!accuracy || accuracy === null) {
    return {
      acceptable: false,
      warning: true,
      message: 'GPS accuracy not available'
    };
  }
  
  if (accuracy > 100) {
    return {
      acceptable: false,
      warning: true,
      message: `GPS accuracy is very poor (${Math.round(accuracy)}m). Please move to a location with better signal.`
    };
  }
  
  if (accuracy > 50) {
    return {
      acceptable: true,
      warning: true,
      message: `GPS accuracy is low (${Math.round(accuracy)}m). Please verify your location.`
    };
  }
  
  return {
    acceptable: true,
    warning: false,
    message: `GPS accuracy: ${Math.round(accuracy)}m`
  };
}

/**
 * Determine if auto-pause should be triggered
 * @param {Object} event - Event object
 * @param {Object} currentLocation - Current user location
 * @param {Object} lastLocation - Last known valid location
 * @returns {Object} {shouldPause: boolean, reason: string}
 */
function shouldAutoPause(event, currentLocation, lastLocation) {
  if (!event.geoRequired) {
    return { shouldPause: false, reason: null };
  }
  
  // Check if GPS is disabled or unavailable
  if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
    return {
      shouldPause: true,
      reason: 'GPS_DISABLED'
    };
  }
  
  // Check GPS accuracy
  const accuracyCheck = checkAccuracy(currentLocation.accuracy);
  if (!accuracyCheck.acceptable) {
    return {
      shouldPause: true,
      reason: 'POOR_ACCURACY'
    };
  }
  
  // Check if user has moved outside radius
  if (lastLocation && event.geoLocation) {
    const validation = validateLocation(event.geoLocation, currentLocation);
    if (!validation.isValid) {
      return {
        shouldPause: true,
        reason: 'GPS_EXIT'
      };
    }
  }
  
  return { shouldPause: false, reason: null };
}

module.exports = {
  calculateDistance,
  validateLocation,
  checkAccuracy,
  shouldAutoPause
};

