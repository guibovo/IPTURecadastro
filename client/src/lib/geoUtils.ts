export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLng = toRadians(point2.longitude - point1.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(point1: Coordinates, point2: Coordinates): number {
  const dLng = toRadians(point2.longitude - point1.longitude);
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Check if a point is within a polygon (ray casting algorithm)
 */
export function isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate bounding box for a set of coordinates
 */
export function calculateBoundingBox(coordinates: Coordinates[]): BoundingBox {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate bounding box for empty coordinates array');
  }

  let north = coordinates[0].latitude;
  let south = coordinates[0].latitude;
  let east = coordinates[0].longitude;
  let west = coordinates[0].longitude;

  for (const coord of coordinates) {
    north = Math.max(north, coord.latitude);
    south = Math.min(south, coord.latitude);
    east = Math.max(east, coord.longitude);
    west = Math.min(west, coord.longitude);
  }

  return { north, south, east, west };
}

/**
 * Get current GPS location with high accuracy
 */
export function getCurrentLocation(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions);
  });
}

/**
 * Watch GPS location with high accuracy
 */
export function watchLocation(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
    ...options
  };

  return navigator.geolocation.watchPosition(callback, errorCallback, defaultOptions);
}

/**
 * Stop watching GPS location
 */
export function stopWatchingLocation(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates, precision: number = 6): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Convert coordinates to decimal degrees from degrees/minutes/seconds
 */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: 'N' | 'S' | 'E' | 'W'): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

/**
 * Convert decimal degrees to degrees/minutes/seconds
 */
export function decimalToDms(decimal: number): { degrees: number; minutes: number; seconds: number; direction: string } {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  
  let direction: string;
  if (decimal >= 0) {
    direction = decimal.toString().includes('lat') ? 'N' : 'E';
  } else {
    direction = decimal.toString().includes('lat') ? 'S' : 'W';
  }
  
  return { degrees, minutes, seconds, direction };
}

/**
 * Generate Google Maps navigation URL
 */
export function generateGoogleMapsUrl(destination: Coordinates, mode: 'driving' | 'walking' | 'transit' = 'driving'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=${mode}`;
}

/**
 * Generate Waze navigation URL
 */
export function generateWazeUrl(destination: Coordinates): string {
  return `https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`;
}

/**
 * Open navigation app
 */
export function openNavigation(destination: Coordinates, preferredApp: 'google' | 'waze' = 'waze'): void {
  const googleUrl = generateGoogleMapsUrl(destination);
  const wazeUrl = generateWazeUrl(destination);
  
  if (preferredApp === 'waze') {
    window.open(wazeUrl, '_blank') || window.open(googleUrl, '_blank');
  } else {
    window.open(googleUrl, '_blank');
  }
}

/**
 * Validate coordinates
 */
export function validateCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Get accuracy description from GPS accuracy value
 */
export function getAccuracyDescription(accuracy: number): string {
  if (accuracy <= 5) return 'Excelente';
  if (accuracy <= 10) return 'Boa';
  if (accuracy <= 20) return 'Regular';
  if (accuracy <= 50) return 'Baixa';
  return 'Muito baixa';
}

/**
 * Get accuracy color for UI
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy <= 10) return 'text-green-600';
  if (accuracy <= 20) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Simple shapefile to GeoJSON converter (basic implementation)
 * Note: This is a simplified version. In production, use a proper library like shapefile-js
 */
export function convertShapefileToGeoJSON(shapefileData: ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // This is a placeholder implementation
      // In a real application, you would use a library like shapefile-js
      // or process the shapefile on the server side
      
      const mockGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-46.6333, -23.5505]
            },
            properties: {
              id: 1,
              address: 'Rua Exemplo, 123',
              property_code: '12.345.678-9'
            }
          }
        ]
      };
      
      // Simulate processing time
      setTimeout(() => {
        resolve(mockGeoJSON);
      }, 1000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Reproject coordinates (basic implementation for common cases)
 */
export function reprojectCoordinates(
  coords: Coordinates, 
  fromSRS: string, 
  toSRS: string = 'EPSG:4326'
): Coordinates {
  // This is a simplified implementation
  // In production, use a proper projection library like proj4js
  
  if (fromSRS === toSRS) {
    return coords;
  }
  
  // Handle common Brazilian projections
  if (fromSRS === 'EPSG:31983' && toSRS === 'EPSG:4326') {
    // Simplified conversion from SIRGAS 2000 UTM 23S to WGS84
    // This is just a placeholder - use proper proj4js for real conversions
    return {
      latitude: coords.latitude / 111320,
      longitude: coords.longitude / 111320
    };
  }
  
  // Default: return unchanged
  return coords;
}
