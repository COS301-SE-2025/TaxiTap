import { ProximityService, Location } from './ProximityService';
import { NotificationService } from './NotificationService';

export interface ProximityAlertConfig {
  alertDistance: number; // km
  arrivalDistance: number; // km
  checkInterval: number; // seconds
  enablePushNotifications: boolean;
  enableInAppAlerts: boolean;
}

export interface RideProximityData {
  rideId: string;
  driverId: string;
  passengerId: string;
  driverLocation: Location;
  pickupLocation: Location;
  lastAlertSent?: number;
  lastProximityStatus?: 'far' | 'approaching' | 'near' | 'arrived';
}

export class ProximityAlertService {
  private static activeRides = new Map<string, RideProximityData>();
  private static checkIntervals = new Map<string, NodeJS.Timeout>();
  private static defaultConfig: ProximityAlertConfig = {
    alertDistance: 3.0, // 3km
    arrivalDistance: 0.1, // 100m
    checkInterval: 30, // 30 seconds
    enablePushNotifications: true,
    enableInAppAlerts: true,
  };

  /**
   * Start monitoring proximity for a ride
   */
  static startMonitoring(
    rideData: RideProximityData,
    config: Partial<ProximityAlertConfig> = {},
    onProximityAlert?: (alert: any) => void
  ): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Store ride data
    this.activeRides.set(rideData.rideId, rideData);
    
    // Clear existing interval if any
    this.stopMonitoring(rideData.rideId);
    
    // Start monitoring interval
    const interval = setInterval(() => {
      this.checkProximity(rideData.rideId, finalConfig, onProximityAlert);
    }, finalConfig.checkInterval * 1000);
    
    this.checkIntervals.set(rideData.rideId, interval);
    
    console.log(`🚗 Started proximity monitoring for ride ${rideData.rideId}`);
  }

  /**
   * Stop monitoring proximity for a ride
   */
  static stopMonitoring(rideId: string): void {
    const interval = this.checkIntervals.get(rideId);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(rideId);
    }
    
    this.activeRides.delete(rideId);
    console.log(`🛑 Stopped proximity monitoring for ride ${rideId}`);
  }

  /**
   * Check proximity for a specific ride
   */
  private static checkProximity(
    rideId: string,
    config: ProximityAlertConfig,
    onProximityAlert?: (alert: any) => void
  ): void {
    const rideData = this.activeRides.get(rideId);
    if (!rideData) {
      this.stopMonitoring(rideId);
      return;
    }

    const distance = ProximityService.calculateDistance(
      rideData.driverLocation,
      rideData.pickupLocation
    );

    const currentStatus = ProximityService.getProximityStatus(distance);
    const previousStatus = rideData.lastProximityStatus;

    // Update ride data
    rideData.lastProximityStatus = currentStatus;

    // Check if we should send an alert
    if (this.shouldSendAlert(currentStatus, previousStatus, rideData.lastAlertSent, config)) {
      const alert = this.createProximityAlert(rideData, distance, currentStatus, config);
      
      // Send push notification if enabled
      if (config.enablePushNotifications) {
        this.sendPushNotification(alert);
      }
      
      // Trigger in-app alert if enabled
      if (config.enableInAppAlerts && onProximityAlert) {
        onProximityAlert(alert);
      }
      
      // Update last alert sent time
      rideData.lastAlertSent = Date.now();
    }
  }

  /**
   * Determine if we should send an alert
   */
  private static shouldSendAlert(
    currentStatus: string,
    previousStatus: string | undefined,
    lastAlertSent: number | undefined,
    config: ProximityAlertConfig
  ): boolean {
    const now = Date.now();
    const minInterval = 2 * 60 * 1000; // 2 minutes minimum between alerts
    
    // Don't send if we just sent an alert
    if (lastAlertSent && (now - lastAlertSent) < minInterval) {
      return false;
    }
    
    // Send if status changed to a more urgent level
    if (previousStatus && this.getStatusPriority(currentStatus) > this.getStatusPriority(previousStatus)) {
      return true;
    }
    
    // Send if driver is approaching and we haven't sent an alert yet
    if (currentStatus === 'approaching' && !lastAlertSent) {
      return true;
    }
    
    // Send if driver is near and we haven't sent a near alert
    if (currentStatus === 'near' && previousStatus !== 'near') {
      return true;
    }
    
    // Send if driver has arrived
    if (currentStatus === 'arrived' && previousStatus !== 'arrived') {
      return true;
    }
    
    return false;
  }

  /**
   * Get priority level for proximity status
   */
  private static getStatusPriority(status: string): number {
    switch (status) {
      case 'far': return 0;
      case 'approaching': return 1;
      case 'near': return 2;
      case 'arrived': return 3;
      default: return 0;
    }
  }

  /**
   * Create proximity alert object
   */
  private static createProximityAlert(
    rideData: RideProximityData,
    distance: number,
    status: string,
    config: ProximityAlertConfig
  ): any {
    const eta = ProximityService.calculateETA(distance);
    
    let title: string;
    let message: string;
    let type: 'info' | 'success' | 'warning' = 'info';
    
    switch (status) {
      case 'approaching':
        title = 'Driver Approaching';
        message = `Your driver is ${ProximityService.formatDistance(distance)} away. Estimated arrival: ${ProximityService.formatTime(eta)}`;
        type = 'info';
        break;
      case 'near':
        title = 'Driver Nearby';
        message = `Your driver is ${ProximityService.formatDistance(distance)} away. Please be ready for pickup.`;
        type = 'warning';
        break;
      case 'arrived':
        title = 'Driver Arrived';
        message = 'Your driver has arrived at the pickup location.';
        type = 'success';
        break;
      default:
        title = 'Driver Update';
        message = `Your driver is ${ProximityService.formatDistance(distance)} away.`;
        type = 'info';
    }
    
    return {
      rideId: rideData.rideId,
      driverId: rideData.driverId,
      passengerId: rideData.passengerId,
      title,
      message,
      type,
      distance,
      eta,
      status,
      timestamp: Date.now(),
      metadata: {
        rideId: rideData.rideId,
        driverId: rideData.driverId,
        passengerId: rideData.passengerId,
        distance,
        eta,
        status
      }
    };
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(alert: any): Promise<void> {
    try {
      await NotificationService.schedulePushNotification(
        alert.title,
        alert.message,
        alert.metadata
      );
      console.log(`📱 Sent push notification: ${alert.title}`);
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Update driver location for a ride
   */
  static updateDriverLocation(rideId: string, location: Location): void {
    const rideData = this.activeRides.get(rideId);
    if (rideData) {
      rideData.driverLocation = location;
    }
  }

  /**
   * Get all active rides being monitored
   */
  static getActiveRides(): RideProximityData[] {
    return Array.from(this.activeRides.values());
  }

  /**
   * Stop monitoring all rides
   */
  static stopAllMonitoring(): void {
    for (const rideId of this.activeRides.keys()) {
      this.stopMonitoring(rideId);
    }
  }
}
