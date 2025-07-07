import '@testing-library/jest-native/extend-expect'; // Must be first

// Mock NativeAnimatedHelper with a simple empty object
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

(global as any).__DEV__ = true;

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
}));

// Mock RouteContext globally
jest.mock('../../contexts/RouteContext', () => ({
  useRouteContext: jest.fn(() => ({
    setCurrentRoute: jest.fn(),
  })),
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
