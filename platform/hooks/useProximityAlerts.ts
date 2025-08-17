import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ProximityAlertService, RideProximityData } from '../services/ProximityAlertService';
import { useAlertHelpers } from '../components/AlertHelpers';
import { useNotifications } from '../contexts/NotificationContext';

export interface UseProximityAlertsOptions {
  enablePushNotifications?: boolean;
  enableInAppAlerts?: boolean;
  alertDistance?: number;
  arrivalDistance?: number;
  checkInterval?: number;
}

export const useProximityAlerts = (options: UseProximityAlertsOptions = {}) => {
  const { showGlobalAlert, showGlobalError, showGlobalSuccess } = useAlertHelpers();
  const { notifications, markAsRead } = useNotifications();
  const checkRideProximity = useMutation(api.functions.notifications.proximityMonitor.checkRideProximity);
  
  const activeRidesRef = useRef<Set<string>>(new Set());
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  const handleProximityAlert = useCallback((alert: any) => {
    const { title, message, type, status, distance, eta } = alert;

    // Show in-app alert using the new alert system
    const alertConfig = {
      title,
      message,
      type: type as 'info' | 'success' | 'warning',
      duration: status === 'arrived' ? 0 : 5000, // Don't auto-dismiss arrival alerts
      position: 'top' as const,
      animation: 'slide-down' as const,
      actions: status === 'arrived' ? [
        {
          label: 'OK',
          onPress: () => {
            // Mark notification as read if it exists
            const notification = notifications.find(n => 
              n.type === 'driver_5min_away' && 
              n.metadata?.rideId === alert.rideId &&
              !n.isRead
            );
            if (notification) {
              markAsRead(notification._id);
            }
          },
          style: 'default' as const,
        },
      ] : undefined,
    };

    switch (type) {
      case 'success':
        showGlobalSuccess(title, message, alertConfig);
        break;
      case 'warning':
        showGlobalAlert(alertConfig); // Use showGlobalAlert instead of showGlobalWarning
        break;
      default:
        showGlobalAlert(alertConfig);
        break;
    }
  }, [showGlobalAlert, showGlobalSuccess, notifications, markAsRead]);

  // Handle proximity notifications from the backend
  useEffect(() => {
    const proximityNotifications = notifications.filter(
      n => n.type === 'driver_5min_away' && 
           !n.isRead && 
           !processedNotificationsRef.current.has(n._id)
    );

    for (const notification of proximityNotifications) {
      processedNotificationsRef.current.add(notification._id);

      // Get data from the new metadata structure
      const additionalData = notification.metadata?.additionalData;
      const distance = additionalData?.distance;
      const eta = additionalData?.eta;
      const status = additionalData?.status;
      const message = additionalData?.message;
      
      let alertType: 'info' | 'success' | 'warning' = 'info';
      let title = notification.title;

      switch (status) {
        case 'arrived':
          alertType = 'success';
          break;
        case 'near':
          alertType = 'warning';
          break;
        case 'approaching':
          alertType = 'info';
          break;
      }

      const alertConfig = {
        title,
        message: message || notification.message,
        type: alertType,
        duration: status === 'arrived' ? 0 : 5000,
        position: 'top' as const,
        animation: 'slide-down' as const,
        actions: status === 'arrived' ? [
          {
            label: 'OK',
            onPress: () => markAsRead(notification._id),
            style: 'default' as const,
          },
        ] : undefined,
      };

      switch (alertType) {
        case 'success':
          showGlobalSuccess(title, message || notification.message, alertConfig);
          break;
        case 'warning':
          showGlobalAlert(alertConfig); // Use showGlobalAlert instead of showGlobalWarning
          break;
        default:
          showGlobalAlert(alertConfig);
          break;
      }
    }
  }, [notifications, markAsRead, showGlobalAlert, showGlobalSuccess]);

  // Start monitoring a ride for proximity alerts
  const startMonitoringRide = useCallback((
    rideData: RideProximityData,
    customOptions?: Partial<UseProximityAlertsOptions>
  ) => {
    const finalOptions = {
      enablePushNotifications: true,
      enableInAppAlerts: true,
      alertDistance: 3.0,
      arrivalDistance: 0.1,
      checkInterval: 30,
      ...options,
      ...customOptions,
    };

    ProximityAlertService.startMonitoring(
      rideData,
      finalOptions,
      handleProximityAlert
    );

    activeRidesRef.current.add(rideData.rideId);
  }, [options, handleProximityAlert]);

  // Stop monitoring a ride
  const stopMonitoringRide = useCallback((rideId: string) => {
    ProximityAlertService.stopMonitoring(rideId);
    activeRidesRef.current.delete(rideId);
  }, []);

  // Update driver location for a ride
  const updateDriverLocation = useCallback((rideId: string, location: { latitude: number; longitude: number }) => {
    ProximityAlertService.updateDriverLocation(rideId, location);
  }, []);

  // Manually check proximity for a ride
  const checkProximity = useCallback(async (
    rideId: string,
    driverLocation: { latitude: number; longitude: number },
    pickupLocation: { latitude: number; longitude: number }
  ) => {
    try {
      await checkRideProximity({
        rideId,
        driverLocation,
        pickupLocation,
      });
    } catch (error) {
      console.error('Failed to check proximity:', error);
    }
  }, [checkRideProximity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop monitoring all rides when component unmounts
      for (const rideId of activeRidesRef.current) {
        ProximityAlertService.stopMonitoring(rideId);
      }
      activeRidesRef.current.clear();
    };
  }, []);

  return {
    startMonitoringRide,
    stopMonitoringRide,
    updateDriverLocation,
    checkProximity,
    getActiveRides: ProximityAlertService.getActiveRides,
  };
};
