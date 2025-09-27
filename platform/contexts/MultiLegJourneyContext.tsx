import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from './UserContext';
import { Id } from '../convex/_generated/dataModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MultiLegJourney {
  _id: Id<"multiLegJourneys">;
  journeyId: string;
  passengerId: Id<"taxiTap_users">;
  status: "planned" | "in_progress" | "completed" | "cancelled" | "timeout";
  currentLegIndex: number;
  totalLegs: number;
  originLocation: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };
  finalDestination: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime?: number;
  };
  legs: Array<{
    legIndex: number;
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
    actualCost?: number;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    rideId?: Id<"rides">;
    driverId?: Id<"taxiTap_users">;
    startedAt?: number;
    completedAt?: number;
  }>;
  totalEstimatedCost: number;
  totalActualCost?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  transferTimeoutAt?: number;
  transferWindowExpiredAt?: number;
}

interface MultiLegJourneyContextType {
  activeJourney: MultiLegJourney | null;
  isLoadingJourney: boolean;
  refreshJourney: () => void;
  clearJourneyCache: () => Promise<void>;
  hasActiveJourney: boolean;
  getCurrentLeg: () => MultiLegJourney['legs'][0] | null;
  getNextLeg: () => MultiLegJourney['legs'][0] | null;
  isOnLastLeg: boolean;
  journeyProgress: {
    currentLeg: number;
    totalLegs: number;
    progressPercentage: number;
  };
}

const MultiLegJourneyContext = createContext<MultiLegJourneyContextType | undefined>(undefined);

const JOURNEY_CACHE_KEY = 'active_multi_leg_journey_id';

interface MultiLegJourneyProviderProps {
  children: ReactNode;
}

export const MultiLegJourneyProvider: React.FC<MultiLegJourneyProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [cachedJourneyId, setCachedJourneyId] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Query for active journey based on user ID
  const activeJourneyFromDB = useQuery(
    api.functions.journeys.journeyStateManager.getActiveJourneyForPassenger,
    user ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Query for specific journey if we have cached ID
  const cachedJourneyFromDB = useQuery(
    api.functions.journeys.journeyStateManager.getJourneyState,
    cachedJourneyId ? { journeyId: cachedJourneyId } : "skip"
  );

  // Load cached journey ID on mount
  useEffect(() => {
    const loadCachedJourneyId = async () => {
      try {
        const cached = await AsyncStorage.getItem(JOURNEY_CACHE_KEY);
        setCachedJourneyId(cached);
      } catch (error) {
        console.error('Error loading cached journey ID:', error);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadCachedJourneyId();
  }, []);

  // Cache journey ID when active journey changes
  useEffect(() => {
    const cacheJourneyId = async (journeyId: string | null) => {
      try {
        if (journeyId) {
          await AsyncStorage.setItem(JOURNEY_CACHE_KEY, journeyId);
          setCachedJourneyId(journeyId);
        } else {
          await AsyncStorage.removeItem(JOURNEY_CACHE_KEY);
          setCachedJourneyId(null);
        }
      } catch (error) {
        console.error('Error caching journey ID:', error);
      }
    };

    if (activeJourneyFromDB) {
      cacheJourneyId(activeJourneyFromDB.journeyId);
    } else if (activeJourneyFromDB === null && !isLoadingCache) {
      // Only clear cache if we're sure there's no active journey
      cacheJourneyId(null);
    }
  }, [activeJourneyFromDB, isLoadingCache]);

  // Determine the active journey (prefer DB result over cached)
  const activeJourney = activeJourneyFromDB || cachedJourneyFromDB || null;
  const isLoadingJourney = Boolean(isLoadingCache || (user && activeJourneyFromDB === undefined) || (cachedJourneyId && cachedJourneyFromDB === undefined));

  const refreshJourney = () => {
    // Force refresh by clearing and reloading cache
    const reload = async () => {
      try {
        const cached = await AsyncStorage.getItem(JOURNEY_CACHE_KEY);
        setCachedJourneyId(cached);
      } catch (error) {
        console.error('Error refreshing journey:', error);
      }
    };
    reload();
  };

  const clearJourneyCache = async () => {
    try {
      await AsyncStorage.removeItem(JOURNEY_CACHE_KEY);
      setCachedJourneyId(null);
    } catch (error) {
      console.error('Error clearing journey cache:', error);
    }
  };

  const hasActiveJourney = Boolean(activeJourney !== null &&
    (activeJourney?.status === 'planned' || activeJourney?.status === 'in_progress'));

  const getCurrentLeg = () => {
    if (!activeJourney || !hasActiveJourney) return null;
    return activeJourney.legs[activeJourney.currentLegIndex] || null;
  };

  const getNextLeg = () => {
    if (!activeJourney || !hasActiveJourney) return null;
    const nextIndex = activeJourney.currentLegIndex + 1;
    return activeJourney.legs[nextIndex] || null;
  };

  const isOnLastLeg = activeJourney ? activeJourney.currentLegIndex >= activeJourney.totalLegs - 1 : false;

  const journeyProgress = {
    currentLeg: activeJourney ? activeJourney.currentLegIndex + 1 : 0,
    totalLegs: activeJourney ? activeJourney.totalLegs : 0,
    progressPercentage: activeJourney
      ? Math.round(((activeJourney.currentLegIndex + 1) / activeJourney.totalLegs) * 100)
      : 0,
  };

  const contextValue: MultiLegJourneyContextType = {
    activeJourney,
    isLoadingJourney,
    refreshJourney,
    clearJourneyCache,
    hasActiveJourney,
    getCurrentLeg,
    getNextLeg,
    isOnLastLeg,
    journeyProgress,
  };

  return (
    <MultiLegJourneyContext.Provider value={contextValue}>
      {children}
    </MultiLegJourneyContext.Provider>
  );
};

export const useMultiLegJourney = (): MultiLegJourneyContextType => {
  const context = useContext(MultiLegJourneyContext);
  if (context === undefined) {
    throw new Error('useMultiLegJourney must be used within a MultiLegJourneyProvider');
  }
  return context;
};