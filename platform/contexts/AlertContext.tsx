import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";

export type AlertType = "info" | "success" | "warning" | "error" | "custom";

export type AlertPosition = 
  | "top" 
  | "bottom" 
  | "center" 
  | "top-left" 
  | "top-right" 
  | "bottom-left" 
  | "bottom-right";

export type AlertAnimation = 
  | "slide-up" 
  | "slide-down" 
  | "slide-left" 
  | "slide-right" 
  | "fade" 
  | "scale" 
  | "bounce";

export interface AlertAction {
  label: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
}

export interface AlertStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  position: AlertPosition;
  animation: AlertAnimation;
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  actions?: AlertAction[];
  style?: AlertStyle;
  isGlobal?: boolean; // Global alerts persist across navigation
  timestamp: Date;
  data?: any; // Additional data for handling
}

export interface AlertContextType {
  // Global alerts (persist across navigation)
  globalAlerts: Alert[];
  showGlobalAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissGlobalAlert: (id: string) => void;
  dismissAllGlobalAlerts: () => void;
  
  // Local alerts (page-specific)
  localAlerts: Alert[];
  showLocalAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissLocalAlert: (id: string) => void;
  dismissAllLocalAlerts: () => void;
  
  // Utility functions
  showAlert: (alert: Omit<Alert, "id" | "timestamp">) => string;
  dismissAlert: (id: string, isGlobal?: boolean) => void;
  dismissAllAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [globalAlerts, setGlobalAlerts] = useState<Alert[]>([]);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([]);
  
  const globalTimeouts = useRef<Map<string, number>>(new Map());
  const localTimeouts = useRef<Map<string, number>>(new Map());

  // Generate unique ID for alerts
  const generateAlertId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear timeout for an alert
  const clearAlertTimeout = useCallback((id: string, isGlobal: boolean) => {
    const timeouts = isGlobal ? globalTimeouts : localTimeouts;
    const timeout = timeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(id);
    }
  }, []);

  // Set auto-dismiss timeout for an alert
  const setAlertTimeout = useCallback((alert: Alert, isGlobal: boolean) => {
    if (!alert.duration || alert.duration <= 0) return;

    const timeouts = isGlobal ? globalTimeouts : localTimeouts;
    
    const timeout = setTimeout(() => {
      dismissAlert(alert.id, isGlobal);
    }, alert.duration);

    timeouts.current.set(alert.id, timeout);
  }, []);

  // Dismiss a specific alert
  const dismissAlert = useCallback((id: string, isGlobal: boolean = false) => {
    clearAlertTimeout(id, isGlobal);
    
    if (isGlobal) {
      setGlobalAlerts(prev => prev.filter(alert => alert.id !== id));
    } else {
      setLocalAlerts(prev => prev.filter(alert => alert.id !== id));
    }
  }, [clearAlertTimeout]);

  // Show global alert (replaces other global alerts)
  const showGlobalAlert = useCallback((alertData: Omit<Alert, "id" | "timestamp">) => {
    const id = generateAlertId();
    const newAlert: Alert = {
      ...alertData,
      id,
      timestamp: new Date(),
      isGlobal: true,
    };

    // Replace existing global alerts (dismiss all current ones)
    setGlobalAlerts(prev => {
      // Clear timeouts for existing alerts
      prev.forEach(existingAlert => clearAlertTimeout(existingAlert.id, true));
      return [newAlert];
    });

    // Set auto-dismiss timeout
    setAlertTimeout(newAlert, true);

    return id;
  }, [generateAlertId, clearAlertTimeout, setAlertTimeout]);

  // Show local alert (replaces other local alerts)
  const showLocalAlert = useCallback((alertData: Omit<Alert, "id" | "timestamp">) => {
    const id = generateAlertId();
    const newAlert: Alert = {
      ...alertData,
      id,
      timestamp: new Date(),
      isGlobal: false,
    };

    // Replace existing local alerts (dismiss all current ones)
    setLocalAlerts(prev => {
      // Clear timeouts for existing alerts
      prev.forEach(existingAlert => clearAlertTimeout(existingAlert.id, false));
      return [newAlert];
    });

    // Set auto-dismiss timeout
    setAlertTimeout(newAlert, false);

    return id;
  }, [generateAlertId, clearAlertTimeout, setAlertTimeout]);

  // Dismiss all global alerts
  const dismissAllGlobalAlerts = useCallback(() => {
    globalAlerts.forEach(alert => clearAlertTimeout(alert.id, true));
    setGlobalAlerts([]);
  }, [globalAlerts, clearAlertTimeout]);

  // Dismiss all local alerts
  const dismissAllLocalAlerts = useCallback(() => {
    localAlerts.forEach(alert => clearAlertTimeout(alert.id, false));
    setLocalAlerts([]);
  }, [localAlerts, clearAlertTimeout]);

  // Dismiss all alerts (both global and local)
  const dismissAllAlerts = useCallback(() => {
    dismissAllGlobalAlerts();
    dismissAllLocalAlerts();
  }, [dismissAllGlobalAlerts, dismissAllLocalAlerts]);

  // Utility function to show alert (defaults to local)
  const showAlert = useCallback((alertData: Omit<Alert, "id" | "timestamp">) => {
    return showLocalAlert(alertData);
  }, [showLocalAlert]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      globalTimeouts.current.forEach(timeout => clearTimeout(timeout));
      localTimeouts.current.forEach(timeout => clearTimeout(timeout));
      globalTimeouts.current.clear();
      localTimeouts.current.clear();
    };
  }, []);

  return (
    <AlertContext.Provider
      value={{
        globalAlerts,
        showGlobalAlert,
        dismissGlobalAlert: (id: string) => dismissAlert(id, true),
        dismissAllGlobalAlerts,
        
        localAlerts,
        showLocalAlert,
        dismissLocalAlert: (id: string) => dismissAlert(id, false),
        dismissAllLocalAlerts,
        
        showAlert,
        dismissAlert,
        dismissAllAlerts,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
};
