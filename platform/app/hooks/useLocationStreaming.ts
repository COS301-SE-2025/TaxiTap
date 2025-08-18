import { useEffect, useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import * as Location from 'expo-location';

export const useThrottledLocationStreaming = (
  userId: string,
  role: 'driver' | 'passenger' | 'both',
  isActive = true
) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateLocation = useMutation(api.functions.locations.updateUserLocation.updateUserLocation);
  
  // Use refs to prevent stale closures and track state
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateRef = useRef(0);
  const errorCountRef = useRef(0);
  const isActiveRef = useRef(isActive);

  // Update ref when isActive changes
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Location validation function
  const isValidLocation = (lat: number, lng: number): boolean => {
    // Check if coordinates are within valid ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return false;
    }
    
    // Check if coordinates are not exactly 0,0 (common for mock locations)
    if (lat === 0 && lng === 0) {
      return false;
    }
    
    // Check if coordinates are not NaN or Infinity
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
      return false;
    }
    
    return true;
  };

  // Development mode check
  const isDevelopment = __DEV__;

  useEffect(() => {
    if (!isActive || !userId) {
      // Clean up if not active
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const updateInterval = role === 'driver' ? 2000 : 8000; // More frequent updates for visibility
    const maxErrors = 5; // Prevent infinite error loops

    const startTracking = async () => {
      try {
        // Reset error count on successful start
        errorCountRef.current = 0;
        setError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission not granted');
          return;
        }

        // Check if location services are enabled
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
          setError('Location services are disabled. Please enable location services in your device settings.');
          return;
        }

        // Clean up any existing subscription
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
        }

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Use balanced accuracy to avoid spoofer detection
            timeInterval: 5000, // Less frequent checks to avoid triggering anti-spoofer
            distanceInterval: 10, // Larger distance interval
            mayShowUserSettingsDialog: true, // Allow user to adjust settings
          },
          async (position) => {
            if (!isMounted || !isActiveRef.current) return;

            const { latitude, longitude } = position.coords;
            const now = Date.now();

            // Validate location data
            if (!isValidLocation(latitude, longitude)) {
              console.warn('Invalid location data received, skipping update');
              return;
            }

            // Check for suspicious location changes (sudden large jumps)
            if (location && location.latitude && location.longitude) {
              const latDiff = Math.abs(latitude - location.latitude);
              const lngDiff = Math.abs(longitude - location.longitude);
              
              // If location changed by more than 1 degree (roughly 111km), it's suspicious
              if (latDiff > 1 || lngDiff > 1) {
                console.warn('Suspicious location change detected, skipping update');
                return;
              }
            }

            // Always update the local state for immediate UI feedback
            setLocation({ latitude, longitude });

            // Update backend with throttling
            if (now - lastUpdateRef.current > updateInterval) {
              try {
                await updateLocation({
                  userId: userId as Id<'taxiTap_users'>,
                  latitude,
                  longitude,
                  role,
                });
                lastUpdateRef.current = now;
                errorCountRef.current = 0; // Reset error count on success
              } catch (err: any) {
                errorCountRef.current++;
                if (errorCountRef.current <= maxErrors) {
                  setError(`Location update failed: ${err.message}`);
                } else {
                  setError('Too many location update errors. Stopping updates.');
                  // Stop tracking after too many errors
                  if (locationSubscriptionRef.current) {
                    locationSubscriptionRef.current.remove();
                    locationSubscriptionRef.current = null;
                  }
                }
              }
            }
          }
        );
      } catch (err: any) {
        errorCountRef.current++;
        const errorMessage = err.message || 'Unknown error';
        
        // Handle specific location spoofer errors
        if (errorMessage.includes('spoofer') || errorMessage.includes('mock') || errorMessage.includes('simulator')) {
          if (isDevelopment) {
            setError('Location spoofer detected in development. This is normal when using simulators or development tools. Use real GPS location for production testing.');
          } else {
            setError('Location spoofer detected. Please disable any location spoofing apps and use real GPS location.');
          }
        } else if (errorMessage.includes('permission')) {
          setError('Location permission denied. Please enable location permissions in your device settings.');
        } else if (errorMessage.includes('services')) {
          setError('Location services are disabled. Please enable location services in your device settings.');
        } else {
          if (errorCountRef.current <= maxErrors) {
            setError(`Location streaming error: ${errorMessage}`);
          } else {
            setError('Too many location errors. Stopping location tracking.');
          }
        }
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [userId, role, isActive, updateLocation]);

  return { location, error };
};

// Add default export for route compatibility
export default useThrottledLocationStreaming; 