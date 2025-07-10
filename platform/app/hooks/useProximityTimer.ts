import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

//function to trigger periodic proximity checks for scheduled rides
export const useProximityTimer = (isActive: boolean = true) => {
  const triggerProximityCheck = useMutation(api.functions.rides.scheduledProximityCheck.triggerProximityCheck);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Trigger initial check
    triggerProximityCheck();

    // Set up interval for periodic checks
    intervalRef.current = setInterval(() => {
      triggerProximityCheck();
    }, 30000); // 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, triggerProximityCheck]);

  return {
    triggerCheck: triggerProximityCheck,
    isActive
  };
}; 