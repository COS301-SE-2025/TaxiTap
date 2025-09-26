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
  
  // Clear all map context state
  clearMapContext: () => void;
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

  const clearMapContext = () => {
    setCurrentLocation(null);
    setOrigin(null);
    setDestination(null);
    setRouteCoordinates([]);
    setIsLoadingRoute(false);
    setRouteLoaded(false);
    cachedRoutes.clear();
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
    clearMapContext,
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

