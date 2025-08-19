import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import EarningsPage from '../../../app/EarningsPage';

// Mock icon library
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock expo-router navigation
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock theme context
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#fff',
      surface: '#f9f9f9',
      text: '#000',
      textSecondary: '#555',
      primary: '#FF9900',
      border: '#ccc',
    },
    isDark: false,
  }),
}));

// Mock user context
jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({
    user: { id: 'user123', accountType: 'driver' },
  }),
}));

// Mock Convex query
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => [
    {
      dateRangeStart: new Date('2024-07-01').getTime(),
      earnings: 810.5,
      hoursOnline: 42,
      reservations: 18,
      dailyData: [
        { day: 'Mon', earnings: 100 },
        { day: 'Tue', earnings: 120 },
        { day: 'Wed', earnings: 80 },
        { day: 'Thu', earnings: 110 },
        { day: 'Fri', earnings: 150 },
        { day: 'Sat', earnings: 140 },
        { day: 'Sun', earnings: 110 },
      ],
    },
  ]),
}));

describe('EarningsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows weekly earnings amount and label', () => {
    const { getByText } = render(<EarningsPage />);
    expect(getByText('R810.50')).toBeTruthy();
    expect(getByText('Weekly Earnings')).toBeTruthy();
  });

  it('renders daily breakdown for each day', () => {
    const { getByText } = render(<EarningsPage />);
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((day) => {
      expect(getByText(day)).toBeTruthy();
    });
  });

  it('renders summary values', () => {
    const { getByText } = render(<EarningsPage />);
    expect(getByText('42h')).toBeTruthy();
    expect(getByText('18')).toBeTruthy();
    expect(getByText('R19.30')).toBeTruthy();
  });

  it('renders correct week range in dropdown', () => {
    const { getByText } = render(<EarningsPage />);
    expect(getByText('Jul 1 - Jul 7')).toBeTruthy();
  });

  it('opens dropdown when pressed', () => {
    const { getAllByText } = render(<EarningsPage />);
    const dropdownTrigger = getAllByText('Jul 1 - Jul 7')[0]; // First one is the button
    fireEvent.press(dropdownTrigger);
    expect(getAllByText('Jul 1 - Jul 7').length).toBeGreaterThan(1); // Confirms dropdown opened
  });

  it('renders todaysEarnings if provided', () => {
    const { getByText } = render(<EarningsPage todaysEarnings={999.99} />);
    expect(getByText('R999.99')).toBeTruthy();
  });

  it('renders loading screen when no data', () => {
    const useQuery = require('convex/react').useQuery;
    useQuery.mockImplementationOnce(() => null);
    const { UNSAFE_getByType } = render(<EarningsPage />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});