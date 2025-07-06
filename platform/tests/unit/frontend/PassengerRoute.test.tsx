import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PassengerRoute from '../../../app/(tabs)/PassengerRoute';

// Mock dependencies
const mockPush = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
  useNavigation: () => ({
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
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
  }),
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Alert
// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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

const mockEnrichedStops = [
  { id: 'stop-1', name: 'Centurion', order: 1 },
  { id: 'stop-2', name: 'Midrand', order: 2 }
];

describe('PassengerRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    useQuery.mockReturnValue(mockRoutes);
  });

  describe('Component Rendering', () => {
    it('should render route selection screen with available routes', () => {
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('Available Routes (2)')).toBeTruthy();
      expect(getByText('Pretoria to Johannesburg')).toBeTruthy();
      expect(getByText('Cape Town to Stellenbosch')).toBeTruthy();
      expect(getByText('R90.00')).toBeTruthy();
      expect(getByText('R60.00')).toBeTruthy();
    });

    it('should render search functionality', () => {
      const { getByPlaceholderText } = render(<PassengerRoute />);
      
      expect(getByPlaceholderText('Search routes or destinations...')).toBeTruthy();
    });

    it('should display route information correctly', () => {
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('60 min')).toBeTruthy(); // 3600 seconds / 60
      expect(getByText('40 min')).toBeTruthy(); // 2400 seconds / 60
    });
  });

  describe('Search Functionality', () => {
    it('should filter routes by start location', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<PassengerRoute />);
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'Pretoria');
      
      expect(getByText('Pretoria to Johannesburg')).toBeTruthy();
      expect(queryByText('Cape Town to Stellenbosch')).toBeFalsy();
    });

    it('should filter routes by destination', () => {
      const { getByPlaceholderText, getByText, queryByText } = render(<PassengerRoute />);
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'Stellenbosch');
      
      expect(getByText('Cape Town to Stellenbosch')).toBeTruthy();
      expect(queryByText('Pretoria to Johannesburg')).toBeFalsy();
    });

    it('should show no results for invalid search', () => {
      const { getByPlaceholderText, getByText } = render(<PassengerRoute />);
      
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
      
      const { getAllByText } = render(<PassengerRoute />);
      const reserveButtons = getAllByText('Reserve Seat');
      
      fireEvent.press(reserveButtons[0]);
      
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Route coordinates not available");
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
      
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('Page 1 of 3')).toBeTruthy();
      expect(getByText('Showing 1-10 of 25 routes')).toBeTruthy();
    });

    it('should navigate to next page', () => {
      useQuery.mockReturnValue(manyRoutes);
      
      const { getByText } = render(<PassengerRoute />);
      
      const nextButton = getByText('2');
      fireEvent.press(nextButton);
      
      expect(getByText('Page 2 of 3')).toBeTruthy();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no routes available', () => {
      useQuery.mockReturnValue([]);
      
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('No routes available')).toBeTruthy();
    });

    it('should show empty state with search results', () => {
      useQuery.mockReturnValue(mockRoutes);
      
      const { getByPlaceholderText, getByText } = render(<PassengerRoute />);
      
      const searchInput = getByPlaceholderText('Search routes or destinations...');
      fireEvent.changeText(searchInput, 'NonExistentCity');
      
      expect(getByText('No routes found matching your criteria')).toBeTruthy();
    });
  });

  describe('Navigation Options', () => {
    it('should set navigation options on mount', () => {
      render(<PassengerRoute />);
      
      expect(mockSetOptions).toHaveBeenCalledWith({
        title: "Select Route",
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
      
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('R15.00')).toBeTruthy(); // Minimum fare
    });

    it('should show default fare for invalid duration', () => {
      const routeWithInvalidDuration = [{
        ...mockRoutes[0],
        estimatedDuration: 0,
      }];
      
      useQuery.mockReturnValue(routeWithInvalidDuration);
      
      const { getByText } = render(<PassengerRoute />);
      
      expect(getByText('R15.00')).toBeTruthy(); // Default minimum fare
    });
  });
});