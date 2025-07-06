/**
 * PassengerRoute.tsx
 * 
 * Route selection screen for passengers to browse and select available taxi routes.
 * Features include search functionality, pagination, route details, and stop/droppoff information.
 * 
 * @author Moyahabo Hamese
 */

import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { router, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Represents a single stop along a route */
interface RouteStop {
  id: string;
  name: string;
  coordinates: number[];
  order: number;
}

/** Complete route data structure */
interface RouteData {
  routeId: string;
  start: string;
  destination: string;
  startCoords: { latitude: number; longitude: number } | null;
  destinationCoords: { latitude: number; longitude: number } | null;
  stops: RouteStop[];
  fare: number;
  estimatedDuration: number;
  taxiAssociation: string;
  hasStops: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates fare based on estimated duration
 * Pricing: R15 per 10 minutes, minimum R15
 * 
 * @param estimatedDuration - Duration in seconds
 * @returns Calculated fare in Rands
 */
const calculateFareFromDuration = (estimatedDuration: number): number => {
  if (!estimatedDuration || estimatedDuration <= 0) return 15; // Default minimum fare
  
  // R15 per 10 minutes, minimum R15
  return Math.max(15, Math.ceil(estimatedDuration / 600) * 15); // 600 seconds = 10 minutes
};

/**
 * Processes stop names for display
 * Filters out generic "DROP OFF" stops and formats names properly
 * 
 * @param name - Raw stop name
 * @returns Processed stop name or empty string for coordinate-based stops
 */
const processStopName = (name: string): string => {
  if (!name || name.toUpperCase().includes('DROP OFF')) {
    return ''; // Will be handled by coordinate conversion
  }
  
  // Convert to proper case (capitalize first letter of each word)
  return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RouteSelectionScreen - Main component for passenger route selection
 * 
 * Features:
 * - Display available routes with search functionality
 * - Pagination for large route lists
 * - Route details including stops, fare, and duration
 * - Expandable stop information
 * - Navigation to taxi information screen
 */
export default function RouteSelectionScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Fetch all available routes from the database
  const allRoutes = useQuery(api.functions.routes.displayRoutes.displayRoutes);
  
  // Local state for UI management
  const [filteredRoutes, setFilteredRoutes] = useState<RouteData[]>([]);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ROUTES_PER_PAGE = 10;

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  // Configure navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Select Route",
      headerStyle: {
        backgroundColor: theme.background,
      },
      headerTintColor: theme.text,
    });
  }, [navigation, theme]);

  // Process routes with updated fare calculation and stop processing
  const processedRoutes = useMemo(() => {
    if (!allRoutes) return [];
    return allRoutes.map(route => ({
      ...route,
      fare: calculateFareFromDuration(route.estimatedDuration),
      stops: route.stops.map(stop => ({
        ...stop,
        name: processStopName(stop.name) || `Stop ${stop.order}` // Fallback to Stop number if name is empty
      }))
    }));
  }, [allRoutes]);

  // Filter routes based on search term
  useEffect(() => {
    if (!processedRoutes) return;

    let filtered = processedRoutes;

    if (searchTerm) {
      filtered = filtered.filter((route: RouteData) => 
        route.start?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.destination?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRoutes(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [processedRoutes, searchTerm]);

  // ============================================================================
  // PAGINATION LOGIC
  // ============================================================================

  // Calculate pagination values
  const totalPages = Math.ceil(filteredRoutes.length / ROUTES_PER_PAGE);
  const startIndex = (currentPage - 1) * ROUTES_PER_PAGE;
  const endIndex = startIndex + ROUTES_PER_PAGE;
  const currentRoutes = filteredRoutes.slice(startIndex, endIndex);

  /**
   * Generates page numbers for pagination with smart ellipsis
   * Shows up to 5 pages with ellipsis for better UX
   * 
   * @returns Array of page numbers and ellipsis indicators
   */
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination logic
      if (currentPage <= 3) {
        // Show first 3 pages + ... + last page
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        if (totalPages > 4) {
          pages.push('...');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        // Show first page + ... + last 3 pages
        pages.push(1);
        if (totalPages > 4) {
          pages.push('...');
        }
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ... + current-1, current, current+1 + ... + last page
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles route selection and navigation to taxi information screen
   * 
   * @param route - Selected route data
   */
  const handleRouteSelect = (route: RouteData) => {
    if (!route.destinationCoords) {
      Alert.alert("Error", "Route coordinates not available");
      return;
    }

    router.push({
      pathname: '../TaxiInformation',
      params: {
        destinationName: route.destination,
        destinationLat: route.destinationCoords.latitude.toString(),
        destinationLng: route.destinationCoords.longitude.toString(),
        currentName: 'Current Location',
        currentLat: '0',
        currentLng: '0',
        routeId: route.routeId,
        startName: route.start,
        startLat: route.startCoords?.latitude.toString() || '',
        startLng: route.startCoords?.longitude.toString() || '',
      }
    });
  };

  /**
   * Toggles the expanded state of route stops
   * 
   * @param routeId - ID of the route to toggle
   */
  const toggleStops = (routeId: string) => {
    setExpandedRoute(expandedRoute === routeId ? null : routeId);
  };

  /**
   * Handles page navigation
   * 
   * @param page - Page number or ellipsis indicator
   */
  const handlePageChange = (page: number | string) => {
    if (typeof page === 'number' && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Pagination navigation handlers
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // ============================================================================
  // STYLES
  // ============================================================================

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      padding: 16,
    },
    searchContainer: {
      marginBottom: 20,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.surface : '#F8F9FA',
      borderRadius: 12,
      padding: 16,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    routeCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 16,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
      overflow: 'hidden',
    },
    routeHeader: {
      padding: 20,
    },
    routeTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    routeTitleText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    routeFare: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#10B981',
    },
    routeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    routeInfoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      marginBottom: 4,
    },
    routeInfoText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    reserveButton: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    reserveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    viewStopsButton: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopsContainer: {
      backgroundColor: isDark ? theme.surface : '#F8F9FA',
      padding: 20,
    },
    stopsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    stopItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    stopNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    stopNumberText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    stopInfo: {
      flex: 1,
    },
    stopName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    stopType: {
      fontSize: 12,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationContainer: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    paginationInfo: {
      alignItems: 'center',
      marginBottom: 16,
    },
    paginationText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
    },
    paginationSubText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    paginationControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    paginationButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      minWidth: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paginationButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    paginationButtonDisabled: {
      opacity: 0.5,
    },
    paginationButtonText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
    },
    paginationButtonTextActive: {
      color: 'white',
      fontWeight: 'bold',
    },
    paginationEllipsis: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paginationEllipsisText: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: 'bold',
    },
    navButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.primary,
      borderWidth: 1,
      borderColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonDisabled: {
      backgroundColor: theme.border,
      borderColor: theme.border,
    },
    navButtonText: {
      fontSize: 14,
      color: 'white',
      fontWeight: 'bold',
    },
    navButtonTextDisabled: {
      color: theme.textSecondary,
    },
  });

  // ============================================================================
  // SUB-COMPONENTS
  // ============================================================================

  /**
   * RouteStops - Displays enriched stops for a specific route
   * Fetches stop data from the database and renders with proper formatting
   */
  const RouteStops = ({ routeId }: { routeId: string }) => {
    const enrichedStops = useQuery(api.functions.routes.displayRoutes.getEnrichedStopsForRoute, { routeId });
    
    if (!enrichedStops || enrichedStops.length === 0) {
      return (
        <View style={dynamicStyles.stopsContainer}>
          <Text style={dynamicStyles.stopsTitle}>Route Stops</Text>
          <View style={dynamicStyles.emptyState}>
            <Icon name="information-circle-outline" size={48} color={theme.textSecondary} />
            <Text style={dynamicStyles.emptyStateText}>
              No stops available for this route
            </Text>
            <Text style={[dynamicStyles.emptyStateText, { fontSize: 14, marginTop: 8 }]}>
              Please notify the driver of your specific destination
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={dynamicStyles.stopsContainer}>
        <Text style={dynamicStyles.stopsTitle}>Route Stops</Text>
        {enrichedStops.map((stop: any, stopIndex: number) => (
          <View key={stop.id} style={dynamicStyles.stopItem}>
            <View style={[
              dynamicStyles.stopNumber,
              { backgroundColor: theme.primary + '10' }
            ]}>
              <Text style={[
                dynamicStyles.stopNumberText,
                { color: theme.primary, fontWeight: 'bold' }
              ]}>
                {stop.order}
              </Text>
            </View>
            <View style={dynamicStyles.stopInfo}>
              <Text style={dynamicStyles.stopName}>
                {stop.name}
              </Text>
              <Text style={[
                dynamicStyles.stopType,
                { color: theme.textSecondary }
              ]}>
                Stop {stop.order}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  /**
   * StopCount - Displays the number of stops for a route
   * Shows "0 Stops" if no stops are available
   */
  const StopCount = ({ routeId }: { routeId: string }) => {
    const enrichedStops = useQuery(api.functions.routes.displayRoutes.getEnrichedStopsForRoute, { routeId });
    
    if (!enrichedStops || enrichedStops.length === 0) {
      return <Text style={dynamicStyles.routeInfoText}>0 Stops</Text>;
    }
    
    return <Text style={dynamicStyles.routeInfoText}>{enrichedStops.length} Stops</Text>;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (loading) {
    return (
      <View style={[dynamicStyles.container, dynamicStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[dynamicStyles.emptyStateText, { marginTop: 16 }]}>
          Getting your location...
        </Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <ScrollView style={dynamicStyles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={dynamicStyles.searchContainer}>
          <View style={dynamicStyles.searchInputContainer}>
            <Icon name="search" size={20} color={theme.textSecondary} style={dynamicStyles.searchIcon} />
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Search routes or destinations..."
              placeholderTextColor={theme.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>

        {/* Available Routes Section */}
        <Text style={dynamicStyles.sectionTitle}>
          Available Routes {filteredRoutes.length > 0 && `(${filteredRoutes.length})`}
        </Text>

        {/* Routes List or Empty State */}
        {currentRoutes.length === 0 ? (
          <View style={dynamicStyles.emptyState}>
            <Icon name="map-outline" size={64} color={theme.textSecondary} />
            <Text style={dynamicStyles.emptyStateText}>
              {searchTerm
                ? "No routes found matching your criteria"
                : "No routes available"}
            </Text>
          </View>
        ) : (
          currentRoutes.map((route: RouteData, index: number) => (
            <View key={index} style={dynamicStyles.routeCard}>
              {/* Route Header */}
              <View style={dynamicStyles.routeHeader}>
                <View style={dynamicStyles.routeTitle}>
                  <Text style={dynamicStyles.routeTitleText}>
                    {route.start} to {route.destination}
                  </Text>
                  <Text style={dynamicStyles.routeFare}>
                    R{route.fare ? route.fare.toFixed(2) : 'N/A'}
                  </Text>
                </View>

                <View style={dynamicStyles.routeInfo}>
                  <View style={dynamicStyles.routeInfoItem}>
                    <Icon name="time-outline" size={16} color={theme.textSecondary} />
                    <Text style={dynamicStyles.routeInfoText}>
                      {route.estimatedDuration ? `${Math.round(route.estimatedDuration / 60)} min` : 'N/A'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.routeInfoItem}>
                    <Icon name="location-outline" size={16} color={theme.textSecondary} />
                    <StopCount routeId={route.routeId} />
                  </View>
                </View>

                <View style={dynamicStyles.actionButtons}>
                  <TouchableOpacity
                    style={dynamicStyles.reserveButton}
                    onPress={() => handleRouteSelect(route)}
                  >
                    <Text style={dynamicStyles.reserveButtonText}>Reserve Seat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={dynamicStyles.viewStopsButton}
                    onPress={() => toggleStops(route.routeId)}
                  >
                    <Icon 
                      name={expandedRoute === route.routeId ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.text} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Expandable Stops List */}
              {expandedRoute === route.routeId && (
                <RouteStops routeId={route.routeId} />
              )}
            </View>
          ))
        )}

        {/* Pagination Controls */}
        {filteredRoutes.length > ROUTES_PER_PAGE && (
          <View style={dynamicStyles.paginationContainer}>
            {/* Page Information */}
            <View style={dynamicStyles.paginationInfo}>
              <Text style={dynamicStyles.paginationText}>
                Page {currentPage} of {totalPages}
              </Text>
              <Text style={dynamicStyles.paginationSubText}>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredRoutes.length)} of {filteredRoutes.length} routes
              </Text>
            </View>

            {/* Pagination Navigation */}
            <View style={dynamicStyles.paginationControls}>
              {/* First Page Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.navButton,
                  currentPage === 1 && dynamicStyles.navButtonDisabled
                ]}
                onPress={handleFirstPage}
                disabled={currentPage === 1}
              >
                <Icon 
                  name="chevron-back-circle-outline" 
                  size={16} 
                  color={currentPage === 1 ? theme.textSecondary : 'white'} 
                />
              </TouchableOpacity>

              {/* Previous Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.navButton,
                  currentPage === 1 && dynamicStyles.navButtonDisabled
                ]}
                onPress={handlePrevPage}
                disabled={currentPage === 1}
              >
                <Icon 
                  name="chevron-back" 
                  size={16} 
                  color={currentPage === 1 ? theme.textSecondary : 'white'} 
                />
              </TouchableOpacity>

              {/* Page Numbers */}
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <View style={dynamicStyles.paginationEllipsis}>
                      <Text style={dynamicStyles.paginationEllipsisText}>...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        dynamicStyles.paginationButton,
                        currentPage === page && dynamicStyles.paginationButtonActive
                      ]}
                      onPress={() => handlePageChange(page)}
                    >
                      <Text style={[
                        dynamicStyles.paginationButtonText,
                        currentPage === page && dynamicStyles.paginationButtonTextActive
                      ]}>
                        {page}
                      </Text>
                    </TouchableOpacity>
                  )}
                </React.Fragment>
              ))}

              {/* Next Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.navButton,
                  currentPage === totalPages && dynamicStyles.navButtonDisabled
                ]}
                onPress={handleNextPage}
                disabled={currentPage === totalPages}
              >
                <Icon 
                  name="chevron-forward" 
                  size={16} 
                  color={currentPage === totalPages ? theme.textSecondary : 'white'} 
                />
              </TouchableOpacity>

              {/* Last Page Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.navButton,
                  currentPage === totalPages && dynamicStyles.navButtonDisabled
                ]}
                onPress={handleLastPage}
                disabled={currentPage === totalPages}
              >
                <Icon 
                  name="chevron-forward-circle-outline" 
                  size={16} 
                  color={currentPage === totalPages ? theme.textSecondary : 'white'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}