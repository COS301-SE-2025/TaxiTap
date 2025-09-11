import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface MapContextType {
  currentLocation: Location | null;
  origin: Location | null;
  destination: Location | null;
  routeCoordinates: { latitude: number; longitude: number }[];
  isLoadingRoute: boolean;
  routeLoaded: boolean;
  
  setCurrentLocation: (location: Location | null) => void;
  setOrigin: (origin: Location | null) => void;
  setDestination: (destination: Location | null) => void;
  setRouteCoordinates: (coords: { latitude: number; longitude: number }[]) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  setRouteLoaded: (loaded: boolean) => void;
  
  // Cached route data to avoid re-fetching
  cachedRoutes: Map<string, { latitude: number; longitude: number }[]>;
  setCachedRoute: (key: string, coords: { latitude: number; longitude: number }[]) => void;
  getCachedRoute: (key: string) => { latitude: number; longitude: number }[] | null;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [cachedRoutes] = useState(new Map<string, { latitude: number; longitude: number }[]>());

  const setCachedRoute = (key: string, coords: { latitude: number; longitude: number }[]) => {
    cachedRoutes.set(key, coords);
  };

  const getCachedRoute = (key: string) => {
    return cachedRoutes.get(key) || null;
  };

  const value: MapContextType = {
    currentLocation,
    origin,
    destination,
    routeCoordinates,
    isLoadingRoute,
    routeLoaded,
    setCurrentLocation,
    setOrigin,
    setDestination,
    setRouteCoordinates,
    setIsLoadingRoute,
    setRouteLoaded,
    cachedRoutes,
    setCachedRoute,
    getCachedRoute,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};

// Helper function to create cache keys
export const createRouteKey = (origin: Location, destination: Location) => {
  return `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
};

//UNATHI: i made the following additions for multi-leg journey functionality. not sure if the edits i made to the provided code in the document are correct but please check and let me know if anything needs to be changed

// Define a type for Journey
interface Journey {
  totalLegs: number;
  // add other properties as needed
}

// Add to existing context
const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
const [isMultiLegMode, setIsMultiLegMode] = useState(false);
const [currentLegIndex, setCurrentLegIndex] = useState(0);

// New functions
const startMultiLegJourney = (journey: Journey) => {
  setCurrentJourney(journey);
  setIsMultiLegMode(true);
  setCurrentLegIndex(0);
};

const progressToNextLeg = () => {
  if (currentJourney && currentLegIndex < currentJourney.totalLegs - 1) {
    setCurrentLegIndex(prev => prev + 1);
  }
};

//end of Unathi's additions