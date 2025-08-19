import React, { createContext, useContext, useState } from 'react';

interface RouteContextType {
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<string>('Not Set');

  return (
    <RouteContext.Provider value={{ currentRoute, setCurrentRoute }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) throw new Error('useRouteContext must be used within RouteProvider');
  return context;
};
