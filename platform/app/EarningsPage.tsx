import React, { useState, useLayoutEffect, useCallback, useMemo } from 'react';
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
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { useUser } from '../contexts/UserContext';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MIN_BAR_HEIGHT = 8;
const BAR_HEIGHT_MULTIPLIER = 0.4;

function formatDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function formatDateRange(fromTimestamp: number): string {
  const start = new Date(fromTimestamp);
  const end = new Date(fromTimestamp);
  end.setDate(end.getDate() + 6);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

type EarningsPageProps = {
  todaysEarnings?: number;
};

export default function EarningsPage({ todaysEarnings }: EarningsPageProps) {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { user } = useUser();
  const { userId: navId } = useLocalSearchParams<{ userId?: string }>();
  const userId = user?.id || navId || '';

  const shouldRunQuery = !!userId;
  
  const rawData = useQuery(api.functions.earnings.earnings.getWeeklyEarnings, shouldRunQuery ? { driverId: userId as Id<"taxiTap_users"> } : "skip");

  // const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const weeklyData = useMemo(() => {
    if (!rawData) return [];
    return rawData.map((week) => {
      const dateRange = formatDateRange(week.dateRangeStart);
      const dailyData = week.dailyData.map((d: any) => ({
        day: d.day,
        earnings: d.earnings,
        height: Math.max(Math.round(d.earnings * BAR_HEIGHT_MULTIPLIER), MIN_BAR_HEIGHT),
      }));

      return {
        dateRange,
        earnings: week.earnings,
        hoursOnline: week.hoursOnline,
        reservations: week.reservations,
        dailyData,
      };
    });
  }, [rawData]);

  const currentWeek = weeklyData[selectedWeek] ?? weeklyData[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleWeekSelect = useCallback((index: number) => {
    setSelectedWeek(index);
    setIsDropdownOpen(false);
  }, []);
  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), []);

  if (!currentWeek) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.text }}>Loading earnings...</Text>
      </SafeAreaView>
    );
  }

  const averagePerHour = currentWeek.earnings / (currentWeek.hoursOnline || 1);

  const dynamicStyles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surface,
      elevation: 4,
    },
    backButton: {
      padding: 8,
      borderRadius: 24,
      backgroundColor: isDark ? theme.primary : '#f5f5f5',
      marginRight: 12,
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.text },
    content: { padding: 20 },
    dropdownContainer: { marginBottom: 20 },
    dropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    dropdownText: { color: theme.text, fontWeight: 'bold' },
    dropdownList: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 8,
    },
    dropdownItem: { padding: 12 },
    dropdownItemSelected: { backgroundColor: isDark ? theme.primary + '20' : '#eee' },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      elevation: 4,
    },
    amount: { fontSize: 32, fontWeight: 'bold', color: theme.primary, textAlign: 'center' },
    label: { fontSize: 16, color: theme.textSecondary, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
    barsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      minHeight: 100,
      maxHeight: 120,
      marginTop: 10,
    },
    barWrapper: { alignItems: 'center', flex: 1 },
    bar: {
      width: 16,
      backgroundColor: '#FF9900',
      minHeight: MIN_BAR_HEIGHT,
      maxHeight: 100,
    },
    barValue: {
      marginBottom: 4,
      fontSize: 10,
      fontWeight: '900',
      color: '#000000',
      textAlign: 'center',
    },
    barLabel: { marginTop: 6, fontSize: 12, color: theme.textSecondary },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : '#ccc',
    },
    summaryLabel: { fontSize: 16, color: theme.textSecondary },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      <View style={dynamicStyles.container}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={handleGoBack}
            testID="back-button"
          >
            <Icon name="arrow-back" size={24} color={isDark ? '#121212' : '#FF9900'} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Weekly Summary</Text>
        </View>

        <ScrollView style={dynamicStyles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Week Dropdown */}
          <View style={dynamicStyles.dropdownContainer}>
            <TouchableOpacity style={dynamicStyles.dropdownButton} onPress={toggleDropdown}>
              <Text style={dynamicStyles.dropdownText}>{currentWeek.dateRange}</Text>
              <Icon name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            {isDropdownOpen && (
              <View style={dynamicStyles.dropdownList}>
                {weeklyData.map((week, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[dynamicStyles.dropdownItem, selectedWeek === index && dynamicStyles.dropdownItemSelected]}
                    onPress={() => handleWeekSelect(index)}
                  >
                    <Text style={dynamicStyles.dropdownText}>{week.dateRange}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Earnings Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.amount}>R{(todaysEarnings ?? currentWeek.earnings).toFixed(2)}</Text>
            <Text style={dynamicStyles.label}>Weekly Earnings</Text>
          </View>

          {/* Bar Chart */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionTitle}>Daily Breakdown</Text>
            <View style={dynamicStyles.barsContainer}>
              {currentWeek.dailyData.map((day: any, index: any) => (
                <View key={index} style={dynamicStyles.barWrapper}>
                  <Text style={dynamicStyles.barValue}>R{day.earnings.toFixed(0)}</Text>
                  <View style={[dynamicStyles.bar, { height: day.height }]} />
                  <Text style={dynamicStyles.barLabel}>{day.day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Summary */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionTitle}>Summary</Text>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Hours Online</Text>
              <Text style={dynamicStyles.summaryValue}>{currentWeek.hoursOnline}h</Text>
            </View>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Reservations</Text>
              <Text style={dynamicStyles.summaryValue}>{currentWeek.reservations}</Text>
            </View>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Avg per Hour</Text>
              <Text style={dynamicStyles.summaryValue}>R{averagePerHour.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}