import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isActive || !userId) return;

    let locationSubscription: Location.LocationSubscription | null = null;
    let lastUpdate = 0;
    const updateInterval = role === 'driver' ? 3000 : 10000; // ms

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission not granted');
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 1000, // Minimum time (ms) between updates
            distanceInterval: 1, // Minimum distance (meters) between updates
          },
          async (position) => {
            const { latitude, longitude } = position.coords;
            const now = Date.now();

            setLocation({ latitude, longitude });

            if (now - lastUpdate > updateInterval) {
              try {
                await updateLocation({
                  userId: userId as Id<'taxiTap_users'>,
                  latitude,
                  longitude,
                  role,
                });
                lastUpdate = now;
              } catch (err: any) {
                setError(`Location update failed: ${err.message}`);
              }
            }
          }
        );
      } catch (err: any) {
        setError(`Location streaming error: ${err.message}`);
      }
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [userId, role, isActive, updateLocation]);

  return { location, error };
}; 