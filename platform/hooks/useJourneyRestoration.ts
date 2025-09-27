import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useMultiLegJourney } from '../contexts/MultiLegJourneyContext';
import { useUser } from '../contexts/UserContext';
import { useAlertHelpers } from '../components/AlertHelpers';

export interface JourneyRestorationOptions {
  autoNavigateOnRestore?: boolean;
  showRestorationDialog?: boolean;
  onJourneyRestored?: (journey: any) => void;
}

export const useJourneyRestoration = (options: JourneyRestorationOptions = {}) => {
  const {
    autoNavigateOnRestore = true,
    showRestorationDialog = true,
    onJourneyRestored,
  } = options;

  const router = useRouter();
  const { user } = useUser();
  const { showGlobalAlert } = useAlertHelpers();
  const {
    activeJourney,
    isLoadingJourney,
    hasActiveJourney,
    getCurrentLeg,
    getNextLeg,
    journeyProgress,
    clearJourneyCache,
  } = useMultiLegJourney();

  const [hasCheckedRestoration, setHasCheckedRestoration] = useState(false);
  const [restorationHandled, setRestorationHandled] = useState(false);

  useEffect(() => {
    const handleJourneyRestoration = async () => {
      // Only run once when component mounts and data is loaded
      if (isLoadingJourney || hasCheckedRestoration || !user) {
        return;
      }

      setHasCheckedRestoration(true);

      if (hasActiveJourney && activeJourney && !restorationHandled) {
        console.log(`🔄 Found active multi-leg journey: ${activeJourney.journeyId}`);
        console.log(`📍 Journey status: ${activeJourney.status}, leg ${journeyProgress.currentLeg}/${journeyProgress.totalLegs}`);

        setRestorationHandled(true);

        // Callback for custom handling
        if (onJourneyRestored) {
          onJourneyRestored(activeJourney);
        }

        // Handle different journey states
        if (activeJourney.status === 'planned') {
          // Journey was created but first leg not started
          if (showRestorationDialog) {
            showGlobalAlert({
              title: 'Continue Multi-Leg Journey?',
              message: `You have a planned journey from ${activeJourney.originLocation.address} to ${activeJourney.finalDestination.address}. Would you like to continue?`,
              actions: [
                {
                  label: 'Continue Journey',
                  onPress: () => {
                    if (autoNavigateOnRestore) {
                      navigateToCurrentLeg();
                    }
                  },
                  style: 'default',
                },
                {
                  label: 'Cancel Journey',
                  onPress: () => {
                    clearJourneyCache();
                  },
                  style: 'cancel',
                },
              ],
            });
          } else if (autoNavigateOnRestore) {
            navigateToCurrentLeg();
          }
        } else if (activeJourney.status === 'in_progress') {
          // Journey is active
          const currentLeg = getCurrentLeg();
          const nextLeg = getNextLeg();

          if (currentLeg?.status === 'in_progress') {
            // Current leg is active - navigate to ride tracking
            if (showRestorationDialog) {
              showGlobalAlert({
                title: 'Active Journey Found',
                message: `You're currently on leg ${journeyProgress.currentLeg} of your multi-leg journey. Continue tracking your ride?`,
                actions: [
                  {
                    label: 'Continue Tracking',
                    onPress: () => {
                      if (autoNavigateOnRestore) {
                        navigateToSeatReserved(currentLeg);
                      }
                    },
                    style: 'default',
                  },
                  {
                    label: 'View Journey',
                    onPress: () => {
                      if (autoNavigateOnRestore) {
                        navigateToCurrentLeg();
                      }
                    },
                    style: 'default',
                  },
                ],
              });
            } else if (autoNavigateOnRestore) {
              navigateToSeatReserved(currentLeg);
            }
          } else if (currentLeg?.status === 'completed' && nextLeg) {
            // Transfer window - next leg available
            if (activeJourney.transferTimeoutAt && activeJourney.transferTimeoutAt > Date.now()) {
              const remainingMinutes = Math.ceil((activeJourney.transferTimeoutAt - Date.now()) / (60 * 1000));

              if (showRestorationDialog) {
                showGlobalAlert({
                  title: 'Transfer Window Active',
                  message: `Leg ${journeyProgress.currentLeg - 1} complete! You have ${remainingMinutes} minutes to board your next taxi. Ready for leg ${journeyProgress.currentLeg}?`,
                  actions: [
                    {
                      label: 'Continue to Next Leg',
                      onPress: () => {
                        if (autoNavigateOnRestore) {
                          navigateToNextLeg(nextLeg);
                        }
                      },
                      style: 'default',
                    },
                    {
                      label: 'Cancel Journey',
                      onPress: () => {
                        clearJourneyCache();
                      },
                      style: 'cancel',
                    },
                  ],
                });
              } else if (autoNavigateOnRestore) {
                navigateToNextLeg(nextLeg);
              }
            } else {
              // Transfer window expired
              showGlobalAlert({
                title: 'Transfer Window Expired',
                message: 'Your 5-minute transfer window has expired. You can start a new journey from the home screen.',
                actions: [
                  {
                    label: 'OK',
                    onPress: () => {
                      clearJourneyCache();
                    },
                    style: 'default',
                  },
                ],
              });
            }
          }
        }
      }
    };

    handleJourneyRestoration();
  }, [isLoadingJourney, hasActiveJourney, activeJourney, user, hasCheckedRestoration, restorationHandled]);

  const navigateToCurrentLeg = () => {
    if (!activeJourney) return;

    const currentLeg = getCurrentLeg();
    if (!currentLeg) return;

    router.push({
      pathname: '/(tabs)/TaxiInformation',
      params: {
        destinationName: currentLeg.destination.address,
        destinationLat: currentLeg.destination.coordinates.latitude.toString(),
        destinationLng: currentLeg.destination.coordinates.longitude.toString(),
        currentName: currentLeg.origin.address,
        currentLat: currentLeg.origin.coordinates.latitude.toString(),
        currentLng: currentLeg.origin.coordinates.longitude.toString(),
        routeId: activeJourney.journeyId,
        estimatedFare: currentLeg.estimatedCost.toString(),
        isMultiLeg: 'true',
        journeyId: activeJourney.journeyId,
        legIndex: currentLeg.legIndex.toString(),
        totalLegs: activeJourney.totalLegs.toString(),
        routeName: currentLeg.routeName,
      },
    });
  };

  const navigateToNextLeg = (nextLeg: any) => {
    if (!activeJourney) return;

    router.push({
      pathname: '/(tabs)/TaxiInformation',
      params: {
        destinationName: nextLeg.destination.address,
        destinationLat: nextLeg.destination.coordinates.latitude.toString(),
        destinationLng: nextLeg.destination.coordinates.longitude.toString(),
        currentName: nextLeg.origin.address,
        currentLat: nextLeg.origin.coordinates.latitude.toString(),
        currentLng: nextLeg.origin.coordinates.longitude.toString(),
        routeId: activeJourney.journeyId,
        estimatedFare: nextLeg.estimatedCost.toString(),
        isMultiLeg: 'true',
        journeyId: activeJourney.journeyId,
        legIndex: nextLeg.legIndex.toString(),
        totalLegs: activeJourney.totalLegs.toString(),
        routeName: nextLeg.routeName,
      },
    });
  };

  const navigateToSeatReserved = (currentLeg: any) => {
    if (!activeJourney || !currentLeg.rideId) return;

    router.push({
      pathname: '/(tabs)/SeatReserved',
      params: {
        currentLat: currentLeg.origin.coordinates.latitude.toString(),
        currentLng: currentLeg.origin.coordinates.longitude.toString(),
        currentName: currentLeg.origin.address,
        destinationLat: currentLeg.destination.coordinates.latitude.toString(),
        destinationLng: currentLeg.destination.coordinates.longitude.toString(),
        destinationName: currentLeg.destination.address,
        driverId: currentLeg.driverId?.toString() || '',
        fare: currentLeg.estimatedCost.toString(),
        rideId: currentLeg.rideId.toString(),
        isMultiLeg: 'true',
        journeyId: activeJourney.journeyId,
        legIndex: currentLeg.legIndex.toString(),
        totalLegs: activeJourney.totalLegs.toString(),
        routeName: currentLeg.routeName,
      },
    });
  };

  return {
    activeJourney,
    hasActiveJourney,
    isLoadingJourney,
    journeyProgress,
    getCurrentLeg,
    getNextLeg,
    navigateToCurrentLeg,
    navigateToNextLeg,
    navigateToSeatReserved,
    clearJourneyCache,
  };
};