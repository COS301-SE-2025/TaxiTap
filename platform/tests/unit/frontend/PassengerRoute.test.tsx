import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TestWrapper } from '../../utils/TestWrapper';

// Mock dependencies
const mockPush = jest.fn();
const mockSetOptions = jest.fn();

// Create mock functions for alert helpers
const mockShowGlobalError = jest.fn();
const mockShowGlobalSuccess = jest.fn();

// Mock the component before importing it
jest.doMock('../../../app/(tabs)/PassengerRoute', () => {
  const React = require('react');
  const originalModule = jest.requireActual('../../../app/(tabs)/PassengerRoute');
  
  // Inject the showGlobalError into the module's scope
  if (originalModule.default) {
    const OriginalComponent = originalModule.default;
    
    // Wrap the component to inject showGlobalError
    const WrappedComponent = (props: any) => {
      // Make showGlobalError available in the component's scope
      (global as any).showGlobalError = mockShowGlobalError;
      (global as any).showGlobalSuccess = mockShowGlobalSuccess;
      
      return React.createElement(OriginalComponent, props);
    };
    
    return {
      ...originalModule,
      default: WrappedComponent,
    };
  }
  
  return originalModule;
});

// Alternative approach: Mock at the module level
jest.mock('../../../components/AlertHelpers', () => {
  const actualMockShowGlobalError = jest.fn();
  const actualMockShowGlobalSuccess = jest.fn();
  
  // Store references globally so we can access them in tests
  (global as any).mockShowGlobalError = actualMockShowGlobalError;
  (global as any).mockShowGlobalSuccess = actualMockShowGlobalSuccess;
  
  return {
    useAlertHelpers: () => ({
      showGlobalError: actualMockShowGlobalError,
      showGlobalSuccess: actualMockShowGlobalSuccess,
      showGlobalWarning: jest.fn(),
      showGlobalInfo: jest.fn(),
    }),
    showGlobalError: actualMockShowGlobalError,
    showGlobalSuccess: actualMockShowGlobalSuccess,
  };
});

// Mock the AlertContext
jest.mock('../../../contexts/AlertContext', () => ({
  AlertProvider: ({ children }: { children: React.ReactNode }) => children,
  useAlerts: () => ({
    showAlert: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    clearAlerts: jest.fn(),
    alerts: [],
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
  useNavigation: () => ({
    setOptions: mockSetOptions,
  }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Import PassengerRoute after all mocks are set up
const PassengerRoute = require('../../../app/(tabs)/PassengerRoute').default;
const { useQuery } = require('convex/react');

// Mock route data
const mockRoutes = [
  {
    routeId: 'route-1',
    start: 'Pretoria',
    destination: 'Johannesburg',
    startCoords: { latitude: -25.7479, longitude: 28.2293 },
    destinationCoords: { latitude: -26.2041, longitude: 28.0473 },
    stops: [
      { id: 'stop-1', name: 'Centurion', coordinates: [-25.8, 28.1], order: 1 }
    ],
    fare: 45,
    estimatedDuration: 3600,
    taxiAssociation: 'PUTCO',
    hasStops: true,
  },
  {
    routeId: 'route-2',
    start: 'Cape Town',
    destination: 'Stellenbosch',
    startCoords: { latitude: -33.9249, longitude: 18.4241 },
    destinationCoords: { latitude: -33.9321, longitude: 18.8602 },
    stops: [],
    fare: 30,
    estimatedDuration: 2400,
    taxiAssociation: 'Golden Arrow',
    hasStops: false,
  }
];

describe('PassengerRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    
    // Clear the global mocks
    if ((global as any).mockShowGlobalError) {
      (global as any).mockShowGlobalError.mockClear();
    }
    if ((global as any).mockShowGlobalSuccess) {
      (global as any).mockShowGlobalSuccess.mockClear();
    }
    
    // Make showGlobalError available globally for the component
    (global as any).showGlobalError = mockShowGlobalError;
    (global as any).showGlobalSuccess = mockShowGlobalSuccess;
    
    useQuery.mockReturnValue(mockRoutes);
  });

  afterEach(() => {
    // Clean up global mocks
    delete (global as any).showGlobalError;
    delete (global as any).showGlobalSuccess;
  });

  describe('Component Rendering', () => {
    it('should render route selection screen with available routes', () => {
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('Available Routes (2)')).toBeTruthy();
      expect(getByText('Pretoria to Johannesburg')).toBeTruthy();
      expect(getByText('Cape Town to Stellenbosch')).toBeTruthy();
      expect(getByText('R90.00')).toBeTruthy();
      expect(getByText('R60.00')).toBeTruthy();
    });

    it('should render search functionality', () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByPlaceholderText('Search routes or destinations...')).toBeTruthy();
    });

    it('should display route information correctly', () => {
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('60 min')).toBeTruthy(); // 3600 seconds / 60
      expect(getByText('40 min')).toBeTruthy(); // 2400 seconds / 60
    });
  });

  describe('Search Functionality', () => {
    it('should filter routes by start location', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'Pretoria');
      
      expect(getByText('Pretoria to Johannesburg')).toBeTruthy();
      expect(queryByText('Cape Town to Stellenbosch')).toBeFalsy();
    });

    it('should filter routes by destination', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'Stellenbosch');
      
      expect(getByText('Cape Town to Stellenbosch')).toBeTruthy();
      expect(queryByText('Pretoria to Johannesburg')).toBeFalsy();
    });

    it('should show no results for invalid search', () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'InvalidCity');
      
      expect(getByText('No routes found matching your criteria')).toBeTruthy();
    });
  });

  describe('Route Selection - Negative Cases', () => {
    it('should show error when route has no destination coordinates', () => {
      const routeWithoutCoords = [{
        ...mockRoutes[0],
        destinationCoords: null
      }];
      
      useQuery.mockReturnValue(routeWithoutCoords);
      
      const { getAllByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      const reserveButtons = getAllByText('Reserve Seat');
      
      fireEvent.press(reserveButtons[0]);
      
      // Check that the global showGlobalError was called
      expect(mockShowGlobalError).toHaveBeenCalledWith(
        "Error", 
        "Route coordinates not available", 
        expect.objectContaining({
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        })
      );
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    const manyRoutes = Array.from({ length: 25 }, (_, i) => ({
      ...mockRoutes[0],
      routeId: `route-${i + 1}`,
      start: `Start ${i + 1}`,
      destination: `Dest ${i + 1}`,
    }));

    it('should show pagination when routes exceed page limit', () => {
      useQuery.mockReturnValue(manyRoutes);
      
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('Page 1 of 3')).toBeTruthy();
      expect(getByText('Showing 1-10 of 25 routes')).toBeTruthy();
    });

    it('should navigate to next page', () => {
      useQuery.mockReturnValue(manyRoutes);
      
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      const nextButton = getByText('2');
      fireEvent.press(nextButton);
      
      expect(getByText('Page 2 of 3')).toBeTruthy();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no routes available', () => {
      useQuery.mockReturnValue([]);
      
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('No routes found')).toBeTruthy();
    });

    it('should show empty state with search results', () => {
      useQuery.mockReturnValue(mockRoutes);
      
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'NonExistentCity');
      
      expect(getByText('No routes found matching your criteria')).toBeTruthy();
    });
  });

  describe('Navigation Options', () => {
    it('should set navigation options on mount', () => {
      render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(mockSetOptions).toHaveBeenCalledWith({
        title: "booking:selectRoute",
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#000000',
      });
    });
  });

  describe('Fare Calculation', () => {
    it('should calculate fare correctly from duration', () => {
      const routeWith10MinDuration = [{
        ...mockRoutes[0],
        estimatedDuration: 600, // 10 minutes
      }];
      
      useQuery.mockReturnValue(routeWith10MinDuration);
      
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('R15.00')).toBeTruthy(); // Minimum fare
    });

    it('should show default fare for invalid duration', () => {
      const routeWithInvalidDuration = [{
        ...mockRoutes[0],
        estimatedDuration: 0,
      }];
      
      useQuery.mockReturnValue(routeWithInvalidDuration);
      
      const { getByText } = render(
        <TestWrapper>
          <PassengerRoute />
        </TestWrapper>
      );
      
      expect(getByText('R15.00')).toBeTruthy(); // Default minimum fare
    });
  });
});