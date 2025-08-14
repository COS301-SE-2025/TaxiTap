import '@testing-library/jest-native/extend-expect'; // Must be first

// Mock NativeAnimatedHelper with a simple empty object
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

(global as any).__DEV__ = true;

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
    getCurrentParams: jest.fn(() => ({})),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useGlobalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  useRootNavigationState: jest.fn(() => ({})),
  useNavigationContainerRef: jest.fn(() => ({})),
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: 'Stack',
  Tabs: 'Tabs',
  Slot: 'Slot',
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  useNetInfo: jest.fn(() => ({ isConnected: true })),
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
}));

beforeAll(() => {
  try {
    require('react-native-gesture-handler/jestSetup');
  } catch {
    jest.mock('react-native-gesture-handler', () => {
      const View = require('react-native/Libraries/Components/View/View');
      return {
        Swipeable: View,
        DrawerLayout: View,
        State: {},
        ScrollView: View,
        Slider: View,
        Switch: View,
        TextInput: View,
        ToolbarAndroid: View,
        ViewPagerAndroid: View,
        WebView: View,
        NativeViewGestureHandler: View,
        TapGestureHandler: View,
        FlingGestureHandler: View,
        ForceTouchGestureHandler: View,
        LongPressGestureHandler: View,
        PanGestureHandler: View,
        PinchGestureHandler: View,
        RotationGestureHandler: View,
        RawButton: View,
        BaseButton: View,
        RectButton: View,
        BorderlessButton: View,
        gestureHandlerRootHOC: jest.fn(x => x),
        Directions: {},
      };
    });
  }
});

// Mock AuthContext globally
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role: 'Passenger',
      phoneNumber: '1234567890',
    },
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
  AuthProvider: ({ children }: { children: any }) => children,
}));

// Mock UserContext globally
jest.mock('../../contexts/UserContext', () => ({
  useUser: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role: 'driver',
      accountType: 'driver' as const,
      phoneNumber: '1234567890',
    },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateUserRole: jest.fn(),
    updateUserName: jest.fn(),
    updateNumber: jest.fn(),
    updateAccountType: jest.fn(),
    setUserId: jest.fn(),
  })),
  UserProvider: ({ children }: { children: any }) => children,
}));

// Mock ThemeContext globally
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: {
      background: '#FFFFFF',
      surface: '#F8F8F8',
      primary: '#FF9900',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      shadow: '#000000',
      card: '#FFFFFF',
    },
    isDark: false,
  })),
  ThemeProvider: ({ children }: { children: any }) => children,
}));

// Mock LanguageContext globally
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: jest.fn(() => ({
    currentLanguage: 'en',
    changeLanguage: jest.fn(),
    t: (key: string, namespace?: string) => {
      // Return English text for common keys used in tests
      const translations: { [key: string]: string } = {
        // Route-related keys
        'searchRoutes': 'Search routes or destinations...',
        'availableRoutes': 'Available Routes',
        'to': 'to',
        'min': 'min',
        'stops': 'stops',
        'reserveSeat': 'Reserve Seat',
        'page': 'Page',
        'of': 'of',
        'showing': 'Showing',
        'routes': 'routes',
        'noRoutesMatching': 'No routes found matching your criteria',
        'noRoutesFound': 'No routes found',
        
        // Driver-related keys
        'error': 'Error',
        'failedToGoOnline': 'Failed to go online',
        'failedToGoOffline': 'Failed to go offline',
        'assignmentFailed': 'Assignment Failed',
        'noRouteAssigned': 'driver.noRouteAssigned',
        
        // Common keys
        'ok': 'OK',
        
        // SetRoute keys
        'selectTaxiAssociation': 'Select Your Taxi Association',
        'yourRoute': 'Your Route',
        'routeAssignment': 'Route Assignment',
        'getYourRoute': 'Get Your Route',
        'yourAssignedRoute': 'Your Assigned Route',
        'getMyRoute': 'Get My Route',
        'currentRoute': 'Current Route',
        'activateRoute': 'Activate Route',
        'selectTaxiAssociationMessage': 'Choose your taxi association to get assigned a route for today.',
        'yourAssignedRouteMessage': 'You already have a route assigned. Tap activate to start using it.',
        'assigningRoute': 'Assigning route...',
        
        // Driver keys used in SetRoute
        'selectTaxiAssociationFirst': 'Select Taxi Association First',
        'selectTaxiAssociationFirstMessage': 'Please select a taxi association first.',
        'userNotFound': 'User Not Found',
        'userNotFoundMessage': 'User not found in the system.',
        'routeAssignedSuccessfully': 'Route Assigned Successfully',
        'routeAssignedMessage': 'Route assigned successfully: {route} with {association}',
        'assignmentFailedMessage': 'Assignment failed'
      };
      
      // Handle namespaced keys (e.g., 'routes:searchRoutes' -> 'searchRoutes')
      const cleanKey = key.includes(':') ? key.split(':')[1] : key;
      return translations[cleanKey] || key;
    },
  })),
  LanguageProvider: ({ children }: { children: any }) => children,
}));

// Mock RouteContext globally
jest.mock('../../contexts/RouteContext', () => ({
  useRouteContext: jest.fn(() => ({
    setCurrentRoute: jest.fn(),
  })),
  RouteProvider: ({ children }: { children: any }) => children,
}));

// Mock NotificationContext globally
jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: jest.fn(() => ({
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearNotifications: jest.fn(),
  })),
  NotificationProvider: ({ children }: { children: any }) => children,
}));

// Mock FeedbackContext globally
jest.mock('../../contexts/FeedbackContext', () => ({
  useFeedback: jest.fn(() => ({
    feedback: [],
    addFeedback: jest.fn(),
    removeFeedback: jest.fn(),
    clearFeedback: jest.fn(),
  })),
  FeedbackProvider: ({ children }: { children: any }) => children,
}));

// Mock MapContext globally
jest.mock('../../contexts/MapContext', () => ({
  useMap: jest.fn(() => ({
    mapRef: null,
    setMapRef: jest.fn(),
    centerMap: jest.fn(),
    addMarker: jest.fn(),
    removeMarker: jest.fn(),
    clearMarkers: jest.fn(),
  })),
  MapProvider: ({ children }: { children: any }) => children,
}));

// Mock react-i18next globally
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Return English text for common keys used in tests
      const translations: { [key: string]: string } = {
        // Route-related keys
        'routes:searchRoutes': 'Search routes or destinations...',
        'routes:availableRoutes': 'Available Routes',
        'routes:to': 'to',
        'routes:min': 'min',
        'routes:stops': 'stops',
        'routes:reserveSeat': 'Reserve Seat',
        'routes:page': 'Page',
        'routes:of': 'of',
        'routes:showing': 'Showing',
        'routes:routes': 'routes',
        'routes:noRoutesMatching': 'No routes found matching your criteria',
        'routes:noRoutesFound': 'No routes found',
        
        // Driver-related keys
        'driver:error': 'Error',
        'driver:failedToGoOnline': 'Failed to go online',
        'driver:failedToGoOffline': 'Failed to go offline',
        'driver:assignmentFailed': 'Assignment Failed',
        'driver:noRouteAssigned': 'driver.noRouteAssigned',
        'driver:routeActivated': 'Route Activated',
        'driver:routeActivatedMessage': 'Your route has been activated:',
        
        // Common keys
        'common.ok': 'OK',
        
        // SetRoute keys
        'selectTaxiAssociation': 'Select Your Taxi Association',
        'yourRoute': 'Your Route',
        'routeAssignment': 'Route Assignment',
        'getYourRoute': 'Get Your Route',
        'yourAssignedRoute': 'Your Assigned Route',
        'getMyRoute': 'Get My Route',
        'currentRoute': 'Current Route',
        'activateRoute': 'Activate Route',
        'selectTaxiAssociationMessage': 'Choose your taxi association to get assigned a route for today.',
        'yourAssignedRouteMessage': 'You already have a route assigned. Tap activate to start using it.',
        'assigningRoute': 'Assigning route...',
        
        // Driver keys used in SetRoute
        'driver.selectTaxiAssociationFirst': 'Select Taxi Association First',
        'driver.selectTaxiAssociationFirstMessage': 'Please select a taxi association first.',
        'driver.userNotFound': 'User Not Found',
        'driver.userNotFoundMessage': 'User not found in the system.',
        'driver.routeAssignedSuccessfully': 'Route Assigned Successfully',
        'driver.routeAssignedMessage': 'Route assigned successfully: {route} with {association}',
        'driver.assignmentFailedMessage': 'Assignment failed',
        'driver.routeActivated': 'Route Activated',
        'driver.routeActivatedMessage': 'Your route has been activated:\n\n{route}'
      };
      
      return translations[key] || key;
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}));

// Mock Convex hooks globally
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
}));

// Jest setup file
beforeEach(() => {
  jest.clearAllMocks();
});
