/**
 * Integration Tests for SetRoute Component and Route Queries
 * 
 * Tests the integration between the SetRoute component and Convex queries/mutations,
 * covering route assignment, activation, and data fetching scenarios.
 * 
 * @author Test Suite
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SetRoute from '../../app/SetRoute';
import { useQuery, useMutation } from 'convex/react';
import { useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouteContext } from '../../contexts/RouteContext';
import { useUser } from '../../contexts/UserContext';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock external dependencies
jest.mock('convex/react');
jest.mock('expo-router');
jest.mock('../../contexts/ThemeContext');
jest.mock('../../contexts/RouteContext');
jest.mock('../../contexts/UserContext');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Type the mocked hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseRouteContext = useRouteContext as jest.MockedFunction<typeof useRouteContext>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

// ============================================================================
// TEST DATA
// ============================================================================

const mockTheme = {
  primary: '#FF9900',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#232F3E',
  textSecondary: '#131A22',
  border: '#E5E7EB',
  tabBarActive: '#FF9900',
  tabBarInactive: '#6B7280',
  tabBarBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
  card: '#FFFFFF',
  shadow: '#000000',
  buttonText: '#FFFFFF'
};

const mockUser = {
  id: 'user_123',
  name: 'Test Driver',
  role: 'driver',
  accountType: 'driver' as const,
  phoneNumber: '+27123456789'
};

const mockAssignedRoute = {
  _id: 'route_123',
  routeId: 'RT001',
  name: 'Johannesburg CBD - Soweto',
  taxiAssociation: 'Greater Johannesburg Taxi Association',
  fare: 25.50,
  estimatedDuration: '45 minutes',
  stops: [],
  isActive: true
};

const mockTaxiAssociations = [
  'Greater Johannesburg Taxi Association',
  'Pretoria Taxi Association',
  'Durban Metro Taxi Association'
];

const mockNavigationMock = {
  goBack: jest.fn(),
  setOptions: jest.fn(),
  navigate: jest.fn()
};

const mockSetCurrentRoute = jest.fn();
const mockAssignRandomRoute = jest.fn();

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Sets up default mocks for all tests
 */
const setupDefaultMocks = () => {
  mockUseTheme.mockReturnValue({
    theme: mockTheme,
    isDark: false,
    themeMode: 'light' as const,
    setThemeMode: jest.fn()
  });

  mockUseNavigation.mockReturnValue(mockNavigationMock);
  
  mockUseRouteContext.mockReturnValue({
    setCurrentRoute: mockSetCurrentRoute,
    currentRoute: 'Not Set'
  });

  mockUseUser.mockReturnValue({
    user: mockUser,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateUserRole: jest.fn(),
    updateUserName: jest.fn(),
    updateNumber: jest.fn(),
    updateAccountType: jest.fn()
  });

  mockUseMutation.mockReturnValue(mockAssignRandomRoute as any);
};

/**
 * Sets up mocks for driver with no assigned route
 */
const setupNoAssignedRouteMocks = () => {
  setupDefaultMocks();
  
  // Mock queries
  mockUseQuery
    .mockReturnValueOnce(null) // assignedRoute
    .mockReturnValueOnce(mockTaxiAssociations); // allTaxiAssociations
};

/**
 * Sets up mocks for driver with assigned route
 */
const setupAssignedRouteMocks = () => {
  setupDefaultMocks();
  
  // Mock queries
  mockUseQuery
    .mockReturnValueOnce(mockAssignedRoute) // assignedRoute
    .mockReturnValueOnce(mockTaxiAssociations); // allTaxiAssociations
};

// ============================================================================
// INTEGRATION TESTS - NO ASSIGNED ROUTE SCENARIO
// ============================================================================

describe('SetRoute Integration Tests - No Assigned Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNoAssignedRouteMocks();
  });

  describe('Component Initialization', () => {
    it('should render route assignment screen when driver has no assigned route', () => {
      render(<SetRoute />);
      
      expect(screen.getByText('Route Assignment')).toBeTruthy();
      expect(screen.getByText('Select Your Taxi Association')).toBeTruthy();
      expect(screen.getByText('Get My Route')).toBeTruthy();
    });

    it('should fetch and display all taxi associations', () => {
      render(<SetRoute />);
      
      mockTaxiAssociations.forEach(association => {
        expect(screen.getByText(association)).toBeTruthy();
      });
    });

    it('should configure navigation header correctly', () => {
      render(<SetRoute />);
      
      expect(mockNavigationMock.setOptions).toHaveBeenCalledWith({
        headerShown: false,
        tabBarStyle: { display: 'none' }
      });
    });
  });

  describe('Taxi Association Selection', () => {
    it('should allow selecting a taxi association', () => {
      render(<SetRoute />);
      
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      // Button should now show selected state (this would be tested via testID in real implementation)
      expect(associationButton).toBeTruthy();
    });
  });

  describe('Route Assignment Process', () => {
    it('should successfully assign route when association is selected', async () => {
      const mockAssignedRouteResult = {
        assignedRoute: mockAssignedRoute
      };
      
      mockAssignRandomRoute.mockResolvedValueOnce(mockAssignedRouteResult);
      
      render(<SetRoute />);
      
      // Select association
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      // Assign route
      const assignButton = screen.getByText('Get My Route');
      fireEvent.press(assignButton);
      
      await waitFor(() => {
        expect(mockAssignRandomRoute).toHaveBeenCalledWith({
          userId: mockUser.id,
          taxiAssociation: mockTaxiAssociations[0]
        });
      });
      
      await waitFor(() => {
        expect(mockSetCurrentRoute).toHaveBeenCalledWith('Johannesburg CBD → Soweto');
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Route Assigned Successfully!',
          expect.stringContaining('Johannesburg CBD → Soweto'),
          expect.any(Array)
        );
      });
    });

    it('should handle route assignment failure', async () => {
      const errorMessage = 'No available routes for this association';
      mockAssignRandomRoute.mockRejectedValueOnce(new Error(errorMessage));
      
      render(<SetRoute />);
      
      // Select association
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      // Assign route
      const assignButton = screen.getByText('Get My Route');
      fireEvent.press(assignButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Assignment Failed',
          errorMessage
        );
      });
    });

    it('should show loading state during route assignment', async () => {
      let resolveAssignment: (value: any) => void;
      const assignmentPromise = new Promise(resolve => {
        resolveAssignment = resolve;
      });
      
      mockAssignRandomRoute.mockReturnValueOnce(assignmentPromise);
      
      render(<SetRoute />);
      
      // Select association
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      // Start assignment
      const assignButton = screen.getByText('Get My Route');
      fireEvent.press(assignButton);
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Assigning Route...')).toBeTruthy();
      });
      
      // Complete assignment
      resolveAssignment!({ assignedRoute: mockAssignedRoute });
      
      await waitFor(() => {
        expect(screen.queryByText('Assigning Route...')).toBeNull();
      });
    });

    it('should call onRouteSet callback when provided', async () => {
      const mockOnRouteSet = jest.fn();
      mockAssignRandomRoute.mockResolvedValueOnce({ assignedRoute: mockAssignedRoute });
      
      render(<SetRoute onRouteSet={mockOnRouteSet} />);
      
      // Select association and assign route
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      const assignButton = screen.getByText('Get My Route');
      fireEvent.press(assignButton);
      
      await waitFor(() => {
        expect(mockOnRouteSet).toHaveBeenCalledWith('Johannesburg CBD → Soweto');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show alert when user is not logged in', async () => {
      // Set up default mocks first
      setupDefaultMocks();
      
      // Mock user as null to simulate not logged in
      mockUseUser.mockReturnValue({
        user: null,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        updateUserRole: jest.fn(),
        updateUserName: jest.fn(),
        updateNumber: jest.fn(),
        updateAccountType: jest.fn()
      });
      
      // Mock queries for no assigned route scenario
      mockUseQuery
        .mockReturnValueOnce(null) // assignedRoute
        .mockReturnValueOnce(mockTaxiAssociations); // allTaxiAssociations
      
      render(<SetRoute />);
      
      // Select association first (this is required for the flow)
      const associationButton = screen.getByText(mockTaxiAssociations[0]);
      fireEvent.press(associationButton);
      
      // Try to assign route
      const assignButton = screen.getByText('Get My Route');
      fireEvent.press(assignButton);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'User not found',
          'You must be logged in as a driver.'
        );
      });
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - ASSIGNED ROUTE SCENARIO
// ============================================================================

describe('SetRoute Integration Tests - Assigned Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupAssignedRouteMocks();
  });

  describe('Assigned Route Display', () => {
    it('should render assigned route screen when driver has a route', () => {
      render(<SetRoute />);
      
      expect(screen.getByText('Your Assigned Route')).toBeTruthy();
      expect(screen.getByText('Johannesburg CBD → Soweto')).toBeTruthy();
      expect(screen.getByText('Greater Johannesburg Taxi Association')).toBeTruthy();
      expect(screen.getByText('Activate Route')).toBeTruthy();
    });

    it('should show correct route information', () => {
      render(<SetRoute />);
      
      expect(screen.getByText('Current Route')).toBeTruthy();
      expect(screen.getByText('Johannesburg CBD → Soweto')).toBeTruthy();
      expect(screen.getByText('Greater Johannesburg Taxi Association')).toBeTruthy();
    });
  });

  describe('Route Activation', () => {
    it('should activate existing route successfully', async () => {
      render(<SetRoute />);
      
      const activateButton = screen.getByText('Activate Route');
      fireEvent.press(activateButton);
      
      await waitFor(() => {
        expect(mockSetCurrentRoute).toHaveBeenCalledWith('Johannesburg CBD → Soweto');
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Route Activated',
          expect.stringContaining('Johannesburg CBD → Soweto'),
          expect.any(Array)
        );
      });
    });

    it('should call onRouteSet callback when activating route', async () => {
      const mockOnRouteSet = jest.fn();
      
      render(<SetRoute onRouteSet={mockOnRouteSet} />);
      
      const activateButton = screen.getByText('Activate Route');
      fireEvent.press(activateButton);
      
      await waitFor(() => {
        expect(mockOnRouteSet).toHaveBeenCalledWith('Johannesburg CBD → Soweto');
      });
    });

    it('should navigate back after successful activation', async () => {
      render(<SetRoute />);
      
      const activateButton = screen.getByText('Activate Route');
      fireEvent.press(activateButton);
      
      // Wait for alert and simulate OK press
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
      
      // Simulate pressing OK in alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const okButton = alertCall[2][0]; // First button in buttons array
      okButton.onPress();
      
      expect(mockNavigationMock.goBack).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - ROUTE NAME PARSING
// ============================================================================

describe('Route Name Parsing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly parse various route name formats', async () => {
    const testRoutes = [
      {
        input: { ...mockAssignedRoute, name: 'Cape Town - Stellenbosch' },
        expected: 'Cape Town → Stellenbosch'
      },
      {
        input: { ...mockAssignedRoute, name: 'Durban CBD - Pinetown' },
        expected: 'Durban CBD → Pinetown'
      },
      {
        input: { ...mockAssignedRoute, name: 'Pretoria - Centurion' },
        expected: 'Pretoria → Centurion'
      }
    ];

    for (const testCase of testRoutes) {
      setupDefaultMocks();
      mockUseQuery
        .mockReturnValueOnce(testCase.input) // assignedRoute
        .mockReturnValueOnce(mockTaxiAssociations); // allTaxiAssociations

      const { unmount } = render(<SetRoute />);
      
      const activateButton = screen.getByText('Activate Route');
      fireEvent.press(activateButton);
      
      await waitFor(() => {
        expect(mockSetCurrentRoute).toHaveBeenCalledWith(testCase.expected);
      });
      
      unmount();
      jest.clearAllMocks();
      setupDefaultMocks();
    }
  });
});

// ============================================================================
// INTEGRATION TESTS - THEME INTEGRATION
// ============================================================================

describe('Theme Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply dark theme correctly', () => {
    setupNoAssignedRouteMocks();
    mockUseTheme.mockReturnValue({
      theme: {
        ...mockTheme,
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF'
      },
      isDark: true,
      themeMode: 'dark' as const,
      setThemeMode: jest.fn()
    });

    render(<SetRoute />);
    
    // Component should render without errors with dark theme
    expect(screen.getByText('Route Assignment')).toBeTruthy();
  });

  it('should apply light theme correctly', () => {
    setupNoAssignedRouteMocks();
    mockUseTheme.mockReturnValue({
      theme: mockTheme,
      isDark: false,
      themeMode: 'light' as const,
      setThemeMode: jest.fn()
    });

    render(<SetRoute />);
    
    // Component should render without errors with light theme
    expect(screen.getByText('Route Assignment')).toBeTruthy();
  });
});

// ============================================================================
// INTEGRATION TESTS - NAVIGATION INTEGRATION
// ============================================================================

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupNoAssignedRouteMocks();
  });

  it('should handle back button press', () => {
    render(<SetRoute />);
    
    const backButton = screen.getByTestId('back-button');
    fireEvent.press(backButton);
    
    expect(mockNavigationMock.goBack).toHaveBeenCalled();
  });

  it('should navigate back after successful route assignment', async () => {
    mockAssignRandomRoute.mockResolvedValueOnce({ assignedRoute: mockAssignedRoute });
    
    render(<SetRoute />);
    
    // Select association and assign route
    const associationButton = screen.getByText(mockTaxiAssociations[0]);
    fireEvent.press(associationButton);
    
    const assignButton = screen.getByText('Get My Route');
    fireEvent.press(assignButton);
    
    // Wait for alert and simulate OK press
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    
    // Simulate pressing OK in alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0];
    okButton.onPress();
    
    expect(mockNavigationMock.goBack).toHaveBeenCalled();
  });
});

// ============================================================================
// INTEGRATION TESTS - EDGE CASES
// ============================================================================

describe('Edge Cases Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle undefined taxi associations gracefully', () => {
    setupDefaultMocks();
    mockUseQuery
      .mockReturnValueOnce(null) // assignedRoute
      .mockReturnValueOnce(undefined); // allTaxiAssociations

    render(<SetRoute />);
    
    // Should not crash when taxi associations are undefined
    expect(screen.getByText('Route Assignment')).toBeTruthy();
  });

  it('should handle empty taxi associations array', () => {
    setupDefaultMocks();
    mockUseQuery
      .mockReturnValueOnce(null) // assignedRoute
      .mockReturnValueOnce([]); // allTaxiAssociations

    render(<SetRoute />);
    
    expect(screen.getByText('Route Assignment')).toBeTruthy();
    expect(screen.getByText('Select Your Taxi Association')).toBeTruthy();
  });

  it('should handle malformed route names', async () => {
    const malformedRoute = {
      ...mockAssignedRoute,
      name: 'InvalidRouteName'
    };
    
    setupDefaultMocks();
    mockUseQuery
      .mockReturnValueOnce(malformedRoute) // assignedRoute
      .mockReturnValueOnce(mockTaxiAssociations); // allTaxiAssociations

    render(<SetRoute />);
    
    const activateButton = screen.getByText('Activate Route');
    fireEvent.press(activateButton);
    
    // Should handle gracefully even with malformed route name
    await waitFor(() => {
      expect(mockSetCurrentRoute).toHaveBeenCalled();
    });
  });
});