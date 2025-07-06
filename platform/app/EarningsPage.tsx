import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  shadow: string;
}

interface EarningsPageProps {
  todaysEarnings?: number;
}

interface DailyData {
  day: string;
  earnings: number;
  height: number;
}

interface WeekData {
  dateRange: string;
  earnings: number;
  hoursOnline: number;
  reservations: number;
  dailyData: DailyData[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

const SAMPLE_DATA = {
  EARNINGS: [810.50, 675.25, 920.75, 540.00],
  HOURS: [42, 38, 45, 32],
  RESERVATIONS: [18, 15, 22, 12],
  DAILY_MULTIPLIERS: [0.9, 0.7, 1.3, 1.1, 1.5, 0.8, 0.9],
} as const;

const DEFAULT_VALUES = {
  EARNINGS: 700,
  HOURS: 40,
  RESERVATIONS: 16,
  WEEKS_TO_SHOW: 4,
  MIN_BAR_HEIGHT: 8,
  BAR_HEIGHT_MULTIPLIER: 0.5,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the start of the week (Monday) for a given date
 */
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

/**
 * Formats a date to display format (e.g., "Jan 15")
 */
const formatDate = (date: Date): string => {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
};

/**
 * Formats date range for a week (e.g., "Jan 15 - Jan 21")
 */
const formatDateRange = (startDate: Date): string => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Generates sample data for a specific week
 */
const generateWeekData = (weekIndex: number): Omit<WeekData, 'dateRange'> => {
  const earnings = SAMPLE_DATA.EARNINGS[weekIndex] || DEFAULT_VALUES.EARNINGS;
  const hoursOnline = SAMPLE_DATA.HOURS[weekIndex] || DEFAULT_VALUES.HOURS;
  const reservations = SAMPLE_DATA.RESERVATIONS[weekIndex] || DEFAULT_VALUES.RESERVATIONS;
  
  const dailyAverage = earnings / 7;
  
  const dailyData: DailyData[] = DAYS_OF_WEEK.map((day, index) => {
    const multiplier = SAMPLE_DATA.DAILY_MULTIPLIERS[index];
    const dayEarnings = Math.round(dailyAverage * multiplier);
    const height = Math.max(
      Math.round(dayEarnings * DEFAULT_VALUES.BAR_HEIGHT_MULTIPLIER),
      DEFAULT_VALUES.MIN_BAR_HEIGHT
    );
    
    return {
      day,
      earnings: dayEarnings,
      height,
    };
  });

  return {
    earnings,
    hoursOnline,
    reservations,
    dailyData,
  };
};

/**
 * Generates weekly data for the last few weeks
 */
const generateWeeklyData = (): WeekData[] => {
  const today = new Date();
  const weeks: WeekData[] = [];
  
  for (let i = 0; i < DEFAULT_VALUES.WEEKS_TO_SHOW; i++) {
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - (i * 7));
    const startOfWeek = getStartOfWeek(weekStartDate);
    
    const dateRange = formatDateRange(startOfWeek);
    const weekData = generateWeekData(i);
    
    weeks.push({
      dateRange,
      ...weekData
    });
  }
  
  return weeks;
};

// ============================================================================
// COMPONENT STYLES
// ============================================================================

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    shadowColor: theme.shadow,
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDark ? theme.primary : "#f5f5f5",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Dropdown Styles
  dropdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 1000,
  },
  dropdownButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: isDark ? theme.border : "#D4A57D",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: isDark ? theme.border : "#D4A57D",
    borderRadius: 20,
    shadowColor: theme.shadow,
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.border : "#D4A57D",
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.text,
  },
  selectedDropdownItem: {
    backgroundColor: isDark ? theme.primary + '20' : "#ECD9C3",
  },
  
  // Card Styles
  card: {
    backgroundColor: theme.surface,
    borderRadius: 30,
    padding: 24,
    marginBottom: 24,
    shadowColor: theme.shadow,
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  earningsCard: {
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  earningsAmount: {
    color: theme.primary,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  earningsTitle: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  
  // Chart Styles
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  chartLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    marginLeft: 4,
  },
  chartLine: {
    height: 1,
    backgroundColor: isDark ? theme.border : "#D4A57D",
    marginBottom: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    marginBottom: 20,
    minHeight: 120,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    backgroundColor: "#FF9900",
    borderRadius: 12,
    minHeight: DEFAULT_VALUES.MIN_BAR_HEIGHT,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.textSecondary,
    marginTop: 8,
  },
  
  // Summary Styles
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.border : "#D4A57D",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
  summaryValueHighlight: {
    color: theme.primary,
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EarningsPage({}: EarningsPageProps) {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  // State management
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Memoized data
  const weeklyData = React.useMemo(() => generateWeeklyData(), []);
  const currentWeek = weeklyData[selectedWeek];
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Navigation setup
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  // Event handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleWeekSelect = useCallback((weekIndex: number) => {
    setSelectedWeek(weekIndex);
    setIsDropdownOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);

  // Calculated values
  const averagePerHour = currentWeek.earnings / currentWeek.hoursOnline;

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon 
            name="arrow-back" 
            size={24} 
            color={isDark ? "#121212" : "#FF9900"} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Summary</Text>
      </View>
    </View>
  );

  const renderWeekDropdown = () => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={toggleDropdown}
        accessibilityLabel={`Select week: ${currentWeek.dateRange}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isDropdownOpen }}
      >
        <Text style={styles.dropdownButtonText}>
          {currentWeek.dateRange}
        </Text>
        <Icon 
          name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={theme.textSecondary} 
        />
      </TouchableOpacity>
      
      {isDropdownOpen && (
        <View style={styles.dropdownList}>
          {weeklyData.map((week, index) => (
            <TouchableOpacity
              key={`week-${index}`}
              style={[
                styles.dropdownItem,
                selectedWeek === index && styles.selectedDropdownItem,
                index === weeklyData.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => handleWeekSelect(index)}
              accessibilityLabel={`Select week ${week.dateRange}`}
              accessibilityRole="button"
            >
              <Text style={styles.dropdownItemText}>
                {week.dateRange}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderEarningsCard = () => (
    <TouchableOpacity 
      style={[styles.card, styles.earningsCard]} 
      activeOpacity={0.8}
      accessibilityLabel={`Weekly earnings: R${currentWeek.earnings.toFixed(2)}`}
      accessibilityRole="button"
    >
      <Text style={styles.earningsAmount}>
        R{currentWeek.earnings.toFixed(2)}
      </Text>
      <Text style={styles.earningsTitle}>Weekly Earnings</Text>
    </TouchableOpacity>
  );

  const renderChart = () => (
    <View style={styles.card}>
      <Text style={styles.chartTitle}>Daily Breakdown</Text>
      <Text style={styles.chartLabel}>R200</Text>
      <View style={styles.chartLine} />
      
      <View style={styles.barsContainer}>
        {currentWeek.dailyData.map((day, index) => (
          <View 
            key={`day-${index}`} 
            style={styles.barContainer}
            accessibilityLabel={`${day.day}: R${day.earnings}`}
          >
            <View style={[styles.bar, { height: day.height }]} />
            <Text style={styles.barLabel}>{day.day}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.chartLine} />
    </View>
  );

  const renderSummary = () => (
    <View style={styles.card}>
      <Text style={styles.summaryTitle}>Week Summary</Text>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Earnings</Text>
        <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
          R{currentWeek.earnings.toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Hours Online</Text>
        <Text style={styles.summaryValue}>{currentWeek.hoursOnline}h</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Reservations</Text>
        <Text style={styles.summaryValue}>{currentWeek.reservations}</Text>
      </View>
      
      <View style={[styles.summaryRow, styles.summaryRowLast]}>
        <Text style={styles.summaryLabel}>Average per Hour</Text>
        <Text style={styles.summaryValue}>
          R{averagePerHour.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.surface} 
      />
      <View style={styles.container}>
        {renderHeader()}

        <ScrollView 
          style={styles.contentContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderWeekDropdown()}
          {renderEarningsCard()}
          {renderChart()}
          {renderSummary()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}