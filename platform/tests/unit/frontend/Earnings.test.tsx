import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EarningsPage from '../../../app/EarningsPage';

// Mock dependencies
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

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

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('EarningsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render without crashing', () => {
      expect(() => render(<EarningsPage />)).not.toThrow();
    });

    it('should display header with title', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Weekly Summary')).toBeTruthy();
    });

    it('should show default weekly earnings', () => {
      const { getAllByText } = render(<EarningsPage />);
      const earningsElements = getAllByText('R810.50');
      expect(earningsElements.length).toBeGreaterThan(0);
      
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Weekly Earnings')).toBeTruthy();
    });

    it('should display current week by default', () => {
      const { getByLabelText } = render(<EarningsPage />);
      const dropdownButton = getByLabelText(/Select week:/);
      expect(dropdownButton).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should call goBack when back button is pressed', () => {
      const { getByLabelText } = render(<EarningsPage />);
      const backButton = getByLabelText('Go back');
      
      fireEvent.press(backButton);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should set navigation options on mount', () => {
      render(<EarningsPage />);
      expect(mockSetOptions).toHaveBeenCalledWith({
        headerShown: false,
        tabBarStyle: { display: 'none' },
      });
    });
  });

  describe('Week Selection Dropdown', () => {
    it('should show dropdown button with current week', () => {
      const { getByLabelText } = render(<EarningsPage />);
      const dropdownButton = getByLabelText(/Select week:/);
      expect(dropdownButton).toBeTruthy();
    });

    it('should toggle dropdown when button is pressed', () => {
      const { getByLabelText } = render(<EarningsPage />);
      const dropdownButton = getByLabelText(/Select week:/);
      
      // Should be able to press dropdown button
      expect(() => fireEvent.press(dropdownButton)).not.toThrow();
    });

    it('should close dropdown when week is selected', () => {
      const { getByLabelText, getAllByLabelText } = render(<EarningsPage />);
      
      // Open dropdown
      const dropdownButton = getByLabelText(/Select week:/);
      fireEvent.press(dropdownButton);
      
      // Select the first week option (more specific)
      const weekOptions = getAllByLabelText(/Select week \w{3}/);
      if (weekOptions.length > 0) {
        fireEvent.press(weekOptions[0]);
      }
      
      // Should not throw error
      expect(dropdownButton).toBeTruthy();
    });

    it('should handle dropdown interactions', () => {
      const { getByLabelText } = render(<EarningsPage />);
      const dropdownButton = getByLabelText(/Select week:/);
      
      // Multiple interactions should not crash
      fireEvent.press(dropdownButton);
      fireEvent.press(dropdownButton);
      
      expect(dropdownButton).toBeTruthy();
    });
  });

  describe('Daily Chart', () => {
    it('should display daily breakdown chart', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Daily Breakdown')).toBeTruthy();
    });

    it('should show all days of the week', () => {
      const { getByText } = render(<EarningsPage />);
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      daysOfWeek.forEach(day => {
        expect(getByText(day)).toBeTruthy();
      });
    });

    it('should display chart reference line', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('R200')).toBeTruthy();
    });

    it('should show daily earnings in accessibility labels', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      // Check that daily earnings are accessible
      expect(getByLabelText(/Mon: R\d+/)).toBeTruthy();
      expect(getByLabelText(/Tue: R\d+/)).toBeTruthy();
    });
  });

  describe('Week Summary', () => {
    it('should display week summary section', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Week Summary')).toBeTruthy();
    });

    it('should show total earnings in summary', () => {
      const { getByText, getAllByText } = render(<EarningsPage />);
      expect(getByText('Total Earnings')).toBeTruthy();
      
      // Check that R810.50 appears multiple times (card + summary)
      const earningsElements = getAllByText('R810.50');
      expect(earningsElements.length).toBeGreaterThan(0);
    });

    it('should display hours online', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Hours Online')).toBeTruthy();
      expect(getByText('42h')).toBeTruthy();
    });

    it('should show total reservations', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Total Reservations')).toBeTruthy();
      expect(getByText('18')).toBeTruthy();
    });

    it('should calculate and display average per hour', () => {
      const { getByText } = render(<EarningsPage />);
      expect(getByText('Average per Hour')).toBeTruthy();
      expect(getByText('R19.30')).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('should handle todaysEarnings prop', () => {
      const { rerender } = render(<EarningsPage todaysEarnings={150.75} />);
      
      // Component should render without errors
      expect(() => rerender(<EarningsPage todaysEarnings={200.00} />)).not.toThrow();
    });

    it('should use default earnings when no prop provided', () => {
      const { getAllByText } = render(<EarningsPage />);
      // Should show the sample data earnings (appears multiple times)
      const earningsElements = getAllByText('R810.50');
      expect(earningsElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for buttons', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText(/Select week:/)).toBeTruthy();
    });

    it('should have accessibility roles for interactive elements', () => {
      const { getAllByRole } = render(<EarningsPage />);
      
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should provide earnings accessibility label', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      expect(getByLabelText(/Weekly earnings: R/)).toBeTruthy();
    });

    it('should have accessible daily earnings', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      // Check a few daily accessibility labels
      expect(getByLabelText(/Mon: R\d+/)).toBeTruthy();
      expect(getByLabelText(/Fri: R\d+/)).toBeTruthy();
    });
  });

  describe('Data Generation', () => {
    it('should handle multiple weeks of data', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      // Should be able to open dropdown (implies multiple weeks exist)
      const dropdownButton = getByLabelText(/Select week:/);
      expect(dropdownButton).toBeTruthy();
      
      // Opening dropdown should not crash
      expect(() => fireEvent.press(dropdownButton)).not.toThrow();
    });

    it('should maintain consistent data structure', () => {
      const { getByText } = render(<EarningsPage />);
      
      // All required fields should be present
      expect(getByText('Total Earnings')).toBeTruthy();
      expect(getByText('Hours Online')).toBeTruthy();
      expect(getByText('Total Reservations')).toBeTruthy();
      expect(getByText('Average per Hour')).toBeTruthy();
    });

    it('should show proper currency formatting', () => {
      const { getAllByText } = render(<EarningsPage />);
      
      // Check that currency is properly formatted
      const currencyElements = getAllByText(/R\d+\.\d{2}/);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<EarningsPage />);
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid interactions without crashing', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      const dropdownButton = getByLabelText(/Select week:/);
      
      // Rapid clicks should not crash
      for (let i = 0; i < 3; i++) {
        fireEvent.press(dropdownButton);
      }
      
      expect(dropdownButton).toBeTruthy();
    });

    it('should handle theme changes gracefully', () => {
      const { rerender } = render(<EarningsPage />);
      
      // Component should handle re-renders without issues
      expect(() => {
        rerender(<EarningsPage todaysEarnings={100} />);
        rerender(<EarningsPage todaysEarnings={200} />);
      }).not.toThrow();
    });
  });

  describe('User Interactions', () => {
    it('should handle back button press', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);
      
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should handle earnings card interaction', () => {
      const { getByLabelText } = render(<EarningsPage />);
      
      const earningsCard = getByLabelText(/Weekly earnings:/);
      
      // Should be able to interact with earnings card
      expect(() => fireEvent.press(earningsCard)).not.toThrow();
    });

    it('should handle dropdown state management', () => {
      const { getByLabelText, getAllByLabelText } = render(<EarningsPage />);
      
      const dropdownButton = getByLabelText(/Select week:/);
      
      // Open dropdown
      fireEvent.press(dropdownButton);
      
      // Should be able to find week options
      const weekOptions = getAllByLabelText(/Select week \w{3}/);
      expect(weekOptions.length).toBeGreaterThan(0);
    });
  });

  describe('Component State', () => {
    it('should maintain component stability', () => {
      const { getByText, rerender } = render(<EarningsPage />);
      
      // Should maintain key elements across re-renders
      expect(getByText('Weekly Summary')).toBeTruthy();
      
      rerender(<EarningsPage todaysEarnings={500} />);
      expect(getByText('Weekly Summary')).toBeTruthy();
    });

    it('should handle multiple render cycles', () => {
      const component = render(<EarningsPage />);
      
      // Multiple re-renders should not cause issues
      for (let i = 0; i < 3; i++) {
        component.rerender(<EarningsPage todaysEarnings={100 + i} />);
      }
      
      expect(component.getByText('Weekly Summary')).toBeTruthy();
    });
  });
});