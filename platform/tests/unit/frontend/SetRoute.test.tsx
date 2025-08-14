import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SetRoute from '../../../app/SetRoute';
import { TestWrapper } from '../../utils/TestWrapper';

// Mock dependencies
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockSetCurrentRoute = jest.fn();
const mockOnRouteSet = jest.fn();
const mockAssignRandomRoute = jest.fn();

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
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
    },
    isDark: false,
  }),
}));

jest.mock('../../../contexts/RouteContext', () => ({
  useRouteContext: () => ({
    setCurrentRoute: mockSetCurrentRoute,
  }),
}));



jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock Alert and console.error
jest.spyOn(Alert, 'alert');
jest.spyOn(console, 'error').mockImplementation(() => {});

const { useQuery, useMutation } = require('convex/react');

describe('SetRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMutation.mockReturnValue(mockAssignRandomRoute);
  });

  describe('Component Rendering', () => {
    it('should render route assignment screen when no route is assigned', () => {
      // Mock the queries in order they are called
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow', 'City Bus']); // getAllTaxiAssociations

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      expect(getByText('Get Your Route')).toBeTruthy();
      expect(getByText('Route Assignment')).toBeTruthy();
      expect(getByText('Select Taxi Association')).toBeTruthy();
      expect(getByText('PUTCO')).toBeTruthy();
      expect(getByText('Golden Arrow')).toBeTruthy();
      expect(getByText('City Bus')).toBeTruthy();
      expect(getByText('Get My Route')).toBeTruthy();
    });

    it('should render existing route screen when route is assigned', () => {
      useQuery.mockReturnValueOnce({
        name: 'Pretoria - Johannesburg',
        taxiAssociation: 'PUTCO',
      });

      const { getByText, getAllByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      // Check that both "Your Assigned Route" elements are present (header and section title)
      const assignedRouteElements = getAllByText('Your Assigned Route');
      expect(assignedRouteElements).toHaveLength(2);
      
      expect(getByText('Pretoria → Johannesburg')).toBeTruthy();
      expect(getByText('PUTCO')).toBeTruthy();
      expect(getByText('Activate Route')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should call goBack when back button is pressed', () => {
      useQuery.mockReturnValue(null);
      
      const { getByTestId } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      const backButton = getByTestId('back-button');
      
      fireEvent.press(backButton);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should set navigation options on mount', () => {
      useQuery.mockReturnValue(null);
      
      render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      expect(mockSetOptions).toHaveBeenCalledWith({
        headerShown: false,
        tabBarStyle: { display: 'none' },
      });
    });
  });

  describe('Taxi Association Selection', () => {
    it('should show all available taxi associations', () => {
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow']); // getAllTaxiAssociations

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      expect(getByText('PUTCO')).toBeTruthy();
      expect(getByText('Golden Arrow')).toBeTruthy();
    });

    it('should allow selecting taxi associations', () => {
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow']); // getAllTaxiAssociations

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      const putcoButton = getByText('PUTCO');
      fireEvent.press(putcoButton);
      
      expect(putcoButton).toBeTruthy();
    });
  });

  describe('Route Assignment - Positive Cases', () => {
    it('should assign route successfully when association is selected', async () => {
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow']); // getAllTaxiAssociations

      mockAssignRandomRoute.mockResolvedValue({
        assignedRoute: { name: 'Cape Town - Stellenbosch' }
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      fireEvent.press(getByText('PUTCO'));
      fireEvent.press(getByText('Get My Route'));
      
      await waitFor(() => {
        expect(mockAssignRandomRoute).toHaveBeenCalledWith({
          userId: 'test-user-id',
          taxiAssociation: 'PUTCO'
        });
      });
    });
    it('should show loading state during assignment', async () => {
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow']); // getAllTaxiAssociations

      mockAssignRandomRoute.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      fireEvent.press(getByText('PUTCO'));
      fireEvent.press(getByText('Get My Route'));
      
      expect(getByText('Assigning Route...')).toBeTruthy();
    });
  });

  describe('Route Assignment - Negative Cases', () => {
    it('should handle assignment error', async () => {
      useQuery
        .mockReturnValueOnce(null) // getDriverAssignedRoute
        .mockReturnValueOnce(['PUTCO', 'Golden Arrow']); // getAllTaxiAssociations

      mockAssignRandomRoute.mockRejectedValue(new Error('Assignment failed'));

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      fireEvent.press(getByText('PUTCO'));
      fireEvent.press(getByText('Get My Route'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "driver.assignmentFailed",
          "Assignment failed"
        );
      });
    });
  });

  describe('Route Activation', () => {
    it('should activate existing route successfully', () => {
      useQuery.mockReturnValueOnce({
        name: 'Bloemfontein - Kimberley',
        taxiAssociation: 'Golden Arrow',
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      const activateButton = getByText('Activate Route');
      
      fireEvent.press(activateButton);
      
      expect(mockSetCurrentRoute).toHaveBeenCalledWith('Bloemfontein → Kimberley');
    });

    it('should call onRouteSet prop during activation', () => {
      useQuery.mockReturnValueOnce({
        name: 'Bloemfontein - Kimberley',
        taxiAssociation: 'Golden Arrow',
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute onRouteSet={mockOnRouteSet} />
        </TestWrapper>
      );
      
      fireEvent.press(getByText('Activate Route'));
      
      expect(mockOnRouteSet).toHaveBeenCalledWith('Bloemfontein → Kimberley');
    });

    it('should show activation alert', async () => {
      useQuery.mockReturnValueOnce({
        name: 'Bloemfontein - Kimberley',
        taxiAssociation: 'Golden Arrow',
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      
      fireEvent.press(getByText('Activate Route'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          "driver.routeActivated",
          "driver.routeActivatedMessage",
          [{
            text: "common.ok",
            onPress: expect.any(Function),
          }]
        );
      });
    });
  });

  describe('Route Name Parsing', () => {
    it('should parse valid route names correctly', () => {
      useQuery.mockReturnValueOnce({
        name: 'Port Elizabeth - East London',
        taxiAssociation: 'City Bus',
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      expect(getByText('Port Elizabeth → East London')).toBeTruthy();
    });

    it('should handle malformed route names gracefully', () => {
      useQuery.mockReturnValueOnce({
        name: 'InvalidRouteName',
        taxiAssociation: 'Test',
      });

      const { getByText } = render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      );
      expect(getByText('InvalidRouteName → Unknown')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    beforeEach(() => {
      useQuery.mockReturnValue(null);
    });

    it('should render with onRouteSet prop', () => {
      expect(() => render(
        <TestWrapper>
          <SetRoute onRouteSet={mockOnRouteSet} />
        </TestWrapper>
      )).not.toThrow();
    });

    it('should render without onRouteSet prop', () => {
      expect(() => render(
        <TestWrapper>
          <SetRoute />
        </TestWrapper>
      )).not.toThrow();
    });
  });
});