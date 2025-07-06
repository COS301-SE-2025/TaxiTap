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

        // Clean up any existing subscription
        if (locationSubscriptionRef.current) {
          locationSubscriptionRef.current.remove();
        }

        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High, // Better accuracy for more visible updates
            timeInterval: 2000, // More frequent location checks
            distanceInterval: 5, // Smaller distance for more updates
          },
          async (position) => {
            if (!isMounted || !isActiveRef.current) return;

            const { latitude, longitude } = position.coords;
            const now = Date.now();

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
        if (errorCountRef.current <= maxErrors) {
          setError(`Location streaming error: ${err.message}`);
        } else {
          setError('Too many location errors. Stopping location tracking.');
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