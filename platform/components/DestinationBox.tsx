/**
 * DestinationBox.tsx
 * 
 * A reusable component that displays start and end destinations in a styled box.
 * Used to show route information consistently across the app.
 * 
 * @author Assistant
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

// Function to parse route name in format "Start - End"
const parseRouteName = (routeName: string): { start: string; end: string } => {
  if (!routeName) return { start: 'Unknown Start', end: 'Unknown End' };
  
  const parts = routeName.split('-').map(part => part.trim());
  if (parts.length >= 2) {
    return {
      start: parts[0],
      end: parts[1]
    };
  }
  
  return { start: routeName, end: routeName };
};

// Function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

interface DestinationBoxProps {
  startLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  endLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  estimatedFare?: number;
  estimatedDuration?: number;
  estimatedDistance?: number; // in kilometers
  availableTaxisCount?: number;
  isSearching?: boolean;
  searchRadius?: number;
  nextExpansionCountdown?: number;
  // Route information from routes table
  routeName?: string; // Format: "Start - End"
  routeFare?: number; // Fare from routes table
  routeDuration?: number; // Duration from routes table
}

export default function DestinationBox({
  startLocation,
  endLocation,
  estimatedFare,
  estimatedDuration,
  estimatedDistance,
  availableTaxisCount = 0,
  isSearching = false,
  searchRadius = 0,
  nextExpansionCountdown = 0,
  routeName,
  routeFare,
  routeDuration,
}: DestinationBoxProps) {
  const { theme, isDark } = useTheme();

  // Use route names if available, otherwise fall back to location names
  let startName: string;
  let endName: string;
  
  if (routeName) {
    const parsedRoute = parseRouteName(routeName);
    startName = parsedRoute.start;
    endName = parsedRoute.end;
  } else {
    // Fallback to location names if no route name provided
    startName = startLocation.name;
    endName = endLocation.name;
  }
  
  // Use route data if available, otherwise calculate/use provided values
  const finalDistance = estimatedDistance || calculateDistance(
    startLocation.latitude,
    startLocation.longitude,
    endLocation.latitude,
    endLocation.longitude
  );
  
  const finalDuration = routeDuration || estimatedDuration;
  const finalFare = routeFare || estimatedFare;


  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.06)',
    },
    routeContainer: {
      marginBottom: 16,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startIndicator: {
      backgroundColor: theme.primary,
    },
    endIndicator: {
      backgroundColor: '#FF6B6B',
    },
    locationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FFFFFF',
    },
    locationText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 20,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.06)',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    detailIcon: {
      marginRight: 4,
    },
    detailText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    fareText: {
      color: theme.primary,
      fontWeight: '600',
    },
    taxiCountText: {
      color: availableTaxisCount > 0 ? '#10B981' : theme.textSecondary,
      fontWeight: '600',
    },
    searchStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.15)'
        : 'rgba(59, 130, 246, 0.08)',
      borderRadius: 12,
      marginTop: 12,
    },
    searchStatusText: {
      color: '#3B82F6',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Route Information */}
      <View style={dynamicStyles.routeContainer}>
        {/* Start Location */}
        <View style={dynamicStyles.locationRow}>
          <View style={[dynamicStyles.locationIndicator, dynamicStyles.startIndicator]}>
            <View style={dynamicStyles.locationDot} />
          </View>
          <Text style={dynamicStyles.locationText} numberOfLines={2}>
            {startName}
          </Text>
        </View>


        {/* End Location */}
        <View style={dynamicStyles.locationRow}>
          <View style={[dynamicStyles.locationIndicator, dynamicStyles.endIndicator]}>
            <View style={dynamicStyles.locationDot} />
          </View>
          <Text style={dynamicStyles.locationText} numberOfLines={2}>
            {endName}
          </Text>
        </View>
      </View>

      {/* Details - Simplified and more compact */}
      <View style={dynamicStyles.detailsContainer}>
        {finalDistance > 0 && (
          <View style={dynamicStyles.detailItem}>
            <Icon 
              name="location-outline" 
              size={14} 
              color={theme.textSecondary} 
              style={dynamicStyles.detailIcon}
            />
            <Text style={dynamicStyles.detailText}>
              {finalDistance.toFixed(1)}km
            </Text>
          </View>
        )}

        {finalDuration && (
          <View style={dynamicStyles.detailItem}>
            <Icon 
              name="time-outline" 
              size={14} 
              color={theme.textSecondary} 
              style={dynamicStyles.detailIcon}
            />
            <Text style={dynamicStyles.detailText}>
              {Math.round(finalDuration / 60)}min
            </Text>
          </View>
        )}

        {finalFare && (
          <View style={dynamicStyles.detailItem}>
            <Icon 
              name="cash-outline" 
              size={14} 
              color={theme.primary} 
              style={dynamicStyles.detailIcon}
            />
            <Text style={[dynamicStyles.detailText, dynamicStyles.fareText]}>
              R{finalFare.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={dynamicStyles.detailItem}>
          <Icon 
            name="car-outline" 
            size={14} 
            color={availableTaxisCount > 0 ? '#10B981' : theme.textSecondary} 
            style={dynamicStyles.detailIcon}
          />
          <Text style={[dynamicStyles.detailText, dynamicStyles.taxiCountText]}>
            {availableTaxisCount} taxi{availableTaxisCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Search Status - More compact */}
      {isSearching && (
        <View style={dynamicStyles.searchStatusContainer}>
          <Icon name="search" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
          <Text style={dynamicStyles.searchStatusText}>
            {searchRadius > 0 && nextExpansionCountdown > 0
              ? `Searching ${searchRadius}km • Expanding in ${nextExpansionCountdown}s`
              : `Searching at ${searchRadius}km radius`
            }
          </Text>
        </View>
      )}
    </View>
  );
}