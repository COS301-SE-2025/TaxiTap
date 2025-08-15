/**
 * Proximity Service for calculating distances and managing proximity alerts
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ProximityConfig {
  alertDistance: number; // Distance in km to trigger proximity alert
  arrivalDistance: number; // Distance in km to trigger arrival alert
  checkInterval: number; // Interval in seconds to check proximity
}

export class ProximityService {
  private static readonly EARTH_RADIUS = 6371; // Earth's radius in kilometers

  /**
   * Calculate distance between two points using Haversine formula
   * @param point1 First location
   * @param point2 Second location
   * @returns Distance in kilometers
   */
  static calculateDistance(point1: Location, point2: Location): number {
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    const deltaLat = this.toRadians(point2.latitude - point1.latitude);
    const deltaLon = this.toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if driver is within proximity alert distance
   */
  static isWithinProximityAlert(driverLocation: Location, passengerLocation: Location, alertDistance: number): boolean {
    const distance = this.calculateDistance(driverLocation, passengerLocation);
    return distance <= alertDistance;
  }

  /**
   * Check if driver has arrived at pickup location
   */
  static hasDriverArrived(driverLocation: Location, pickupLocation: Location, arrivalDistance: number = 0.1): boolean {
    const distance = this.calculateDistance(driverLocation, pickupLocation);
    return distance <= arrivalDistance;
  }

  /**
   * Calculate estimated time of arrival based on distance and average speed
   */
  static calculateETA(distance: number, averageSpeed: number = 30): number {
    // averageSpeed in km/h, returns time in minutes
    return (distance / averageSpeed) * 60;
  }

  /**
   * Format distance for display
   */
  static formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Format time for display
   */
  static formatTime(minutes: number): string {
    if (minutes < 1) {
      return 'Less than 1 minute';
    }
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get proximity status based on distance
   */
  static getProximityStatus(distance: number): 'far' | 'approaching' | 'near' | 'arrived' {
    if (distance <= 0.1) return 'arrived';
    if (distance <= 1) return 'near';
    if (distance <= 3) return 'approaching';
    return 'far';
  }
}
