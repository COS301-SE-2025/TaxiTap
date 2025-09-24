import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MultiLegJourneyPreview, MultiLegJourneyOption } from '../../../app/(tabs)/MultiLegJourneyPreview';

// Mock the theme context
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      surface: '#FFFFFF',
      primary: '#FFB84D',
      text: '#333333',
      textSecondary: '#666666',
      border: '#E0E0E0',
      background: '#F8F9FA',
    },
    isDark: false,
  }),
}));

const mockOptions: MultiLegJourneyOption[] = [
  {
    journeyId: 'journey-1',
    totalLegs: 2,
    legs: [
      {
        legIndex: 0,
        fromAddress: 'Origin',
        toAddress: 'Transfer Point',
        fromCoordinates: { latitude: -33.9577, longitude: 18.4612 },
        toCoordinates: { latitude: -33.9249, longitude: 18.4242 },
        estimatedFare: 15.50,
        estimatedDuration: 15,
      },
      {
        legIndex: 1,
        fromAddress: 'Transfer Point',
        toAddress: 'Destination',
        fromCoordinates: { latitude: -33.9249, longitude: 18.4242 },
        toCoordinates: { latitude: -33.9648, longitude: 18.6017 },
        estimatedFare: 20.00,
        estimatedDuration: 20,
      },
    ],
    estimatedTotalFare: 35.50,
    estimatedTotalDuration: 35,
    optimizationPreference: 'shortest_time',
    transferPoints: ['Transfer Point'],
  },
];

describe('MultiLegJourneyPreview', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when hasDirectRoute is true and availableTaxis > 0', () => {
    const { container } = render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={true}
        availableTaxis={3}
      />
    );

    expect(container.children).toHaveLength(0);
  });

  it('should render when hasDirectRoute is false', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={false}
        availableTaxis={0}
      />
    );

    expect(screen.getByText('Multi-Leg Journey')).toBeTruthy();
    expect(screen.getByText('No direct route available. Choose your journey option below.')).toBeTruthy();
  });

  it('should render when hasDirectRoute is true but availableTaxis is 0', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={true}
        availableTaxis={0}
      />
    );

    expect(screen.getByText('Multi-Leg Journey')).toBeTruthy();
    expect(screen.getByText('No taxis available for direct route. Choose your journey option below.')).toBeTruthy();
  });

  it('should show appropriate warning message for no_direct_route reason', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={false}
        availableTaxis={0}
        multilegReason="no_direct_route"
      />
    );

    expect(screen.getByText(/No single taxi route connects your origin and destination/)).toBeTruthy();
  });

  it('should show appropriate warning message for no_taxis_available reason', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={true}
        availableTaxis={0}
        multilegReason="no_taxis_available"
      />
    );

    expect(screen.getByText(/No taxis are currently available for a direct route/)).toBeTruthy();
  });

  it('should show appropriate warning message for no_intersections reason', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={false}
        availableTaxis={0}
        multilegReason="no_intersections"
      />
    );

    expect(screen.getByText(/No suitable transfer points found between routes/)).toBeTruthy();
  });

  it('should call onConfirm when Start Journey is pressed', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={false}
        availableTaxis={0}
      />
    );

    const startButton = screen.getByText('Start Journey');
    fireEvent.press(startButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(mockOptions[0], 'shortest_time');
  });

  it('should call onCancel when Cancel is pressed', () => {
    render(
      <MultiLegJourneyPreview
        options={mockOptions}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        visible={true}
        hasDirectRoute={false}
        availableTaxis={0}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
