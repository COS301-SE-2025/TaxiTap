/**
 * SetRoute.tsx
 * 
 * Route assignment screen for drivers to select their taxi association and get assigned a route.
 * Handles both new route assignments and activation of existing assigned routes.
 * 
 * @author Moyahabo Hamese
 */

import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useRouteContext } from '../contexts/RouteContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useLanguage } from '../contexts/LanguageContext';
import { useAlertHelpers } from '../components/AlertHelpers';
import { LoadingSpinner } from '../components/LoadingSpinner';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Props for the SetRoute component */
interface SetRouteProps {
  onRouteSet?: (route: string) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parses route name into start and destination locations
 * Route names are expected to be in format "Start - Destination"
 * 
 * @param routeName - The route name to parse
 * @returns Object containing start and destination locations
 */
function parseRouteName(routeName: string) {
  const parts = routeName?.split("-").map(part => part.trim()) ?? ["Unknown", "Unknown"];
  return {
    start: parts[0] ?? "Unknown",
    destination: parts[1] ?? "Unknown"
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SetRoute - Main component for driver route assignment
 * 
 * Features:
 * - Display existing assigned route with activation option
 * - Taxi association selection for new route assignment
 * - Random route assignment based on selected association
 * - Integration with route context for app-wide route state
 */
export default function SetRoute({ onRouteSet }: SetRouteProps) {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { setCurrentRoute } = useRouteContext();
  const { user } = useUser();
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [isAssigning, setIsAssigning] = useState(false);
  const [taxiAssociation, setTaxiAssociation] = useState<string>('');
  
  // ============================================================================
  // LANGUAGE CONTEXT
  // ============================================================================
  
  const { currentLanguage, changeLanguage } = useLanguage();
  
  // ============================================================================
  // HARDCODED TRANSLATIONS
  // ============================================================================
  
  const translations = {
    en: {
      yourAssignedRoute: "Your Assigned Route",
      yourAssignedRouteMessage: "You already have a route assigned. Tap activate to start using it.",
      currentRoute: "Current Route",
      activateRoute: "Activate Route",
      getYourRoute: "Get Your Route",
      routeAssignment: "Route Assignment",
      selectTaxiAssociation: "Select Taxi Association",
      selectTaxiAssociationMessage: "Choose your taxi association to get assigned a route for today.",
      selectTaxiAssociationFirst: "Select Taxi Association First",
      selectTaxiAssociationFirstMessage: "Please select a taxi association to get your route assignment.",
      userNotFound: "User Not Found",
      userNotFoundMessage: "Please log in again to continue.",
      noRouteAssigned: "No route could be assigned at this time",
      assignmentFailed: "Assignment Failed",
      assignmentFailedMessage: "Unable to assign route. Please try again.",
      routeAssignedSuccessfully: "Route Assigned Successfully!",
      routeAssignedMessage: "You have been assigned to:\n\n{route}\n\nAssociation: {association}\n\nThis is now your active route.",
      routeActivated: "Route Activated!",
      routeActivatedMessage: "Your route is now active:\n\n{route}",
      getMyRoute: "Get My Route",
      assigningRoute: "Assigning Route...",
      ok: "OK"
    },
    zu: {
      yourAssignedRoute: "Indlela Yakho Ebekelwe",
      yourAssignedRouteMessage: "Lena indlela yakho ebekelwe yaphelele. Yenza isebenze ukuze uqale ukuthola abagibeli.",
      currentRoute: "Indlela Yamanje",
      activateRoute: "Yenza Indlela Isebenze",
      getYourRoute: "Thola Indlela Yakho",
      routeAssignment: "Ukubekwa Kwendlela",
      selectTaxiAssociation: "Khetha Inhlangano YamaTekisi",
      selectTaxiAssociationMessage: "Khetha inhlangano yakho yamaTekisi futhi sizokubekela indlela ngokuzenzakalela. Lokhu kuzoba indlela yakho yaphelele.",
      selectTaxiAssociationFirst: "Khetha Inhlangano YamaTekisi",
      selectTaxiAssociationFirstMessage: "Sicela ukhethe inhlangano yakho yamaTekisi kuqala.",
      userNotFound: "Umsebenzisi Akatholakali",
      userNotFoundMessage: "Kufanele ungene njengomshayeli.",
      noRouteAssigned: "Akukho indlela ebekelwe. Sicela uzame futhi.",
      assignmentFailed: "Ukubekwa Kuhlulekile",
      assignmentFailedMessage: "Kuhlulekile ukubeka indlela. Sicela uzame futhi.",
      routeAssignedSuccessfully: "Indlela Ibekwe Ngempumelelo!",
      routeAssignedMessage: "Ubhekwe ku:\n\n{route}\n\nInhlangano: {association}\n\nLena manje indlela yakho yaphelele.",
      routeActivated: "Indlela Iyasebenza",
      routeActivatedMessage: "Indlela yakho iyasebenza:\n\n{route}",
      getMyRoute: "Thola Indlela Yami",
      assigningRoute: "Kubekwa Indlela...",
      ok: "Kulungile"
    }
  };
  
  const t = (key: string, params?: any) => {
    const lang = currentLanguage === 'zu' ? 'zu' : 'en';
    const translation = translations[lang][key as keyof typeof translations[typeof lang]];
    if (translation && params) {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(`{${param}}`, params[param]);
      }, translation);
    }
    return translation || key;
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Get driver's assigned route
  const assignedRoute = useQuery(
    api.functions.routes.queries.getDriverAssignedRoute,
    user?.id ? { userId: user.id as Id<'taxiTap_users'> } : "skip"
  );

  // Mutation to assign random route
  const assignRandomRoute = useMutation(api.functions.routes.mutations.assignRandomRouteToDriver);

  // Get all taxi associations for selection
  const allTaxiAssociations = useQuery(api.functions.routes.queries.getAllTaxiAssociations);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  // Mount when assignedRoute changes
  useEffect(() => {
    if (assignedRoute) {
      const { start, destination } = parseRouteName(assignedRoute.name);
      setCurrentRoute(`${start} → ${destination}`);
    }
  }, [assignedRoute, setCurrentRoute]);

  // Configure navigation header
  // useLayoutEffect(() => {
  //   navigation.setOptions({
  //     headerShown: false,
  //     tabBarStyle: { display: 'none' },
  //   });
  // }, [navigation]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles new route assignment for drivers
   * Validates input, assigns random route, and updates context
   */
  const handleAssignRoute = async () => {
    if (!taxiAssociation) {
      showGlobalError('Select Taxi Association', 'Please select your taxi association first.', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    if (!user?.id) {
      showGlobalError('User not found', 'You must be logged in as a driver.', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    setIsAssigning(true);

    try {
      const result = await assignRandomRoute({
        userId: user.id as Id<'taxiTap_users'>,
        taxiAssociation,
      });

      // Check if result and assignedRoute exist
      if (!result || !result.assignedRoute) {
        throw new Error(t('driver.noRouteAssigned'));
      }

      const { start, destination } = parseRouteName(result.assignedRoute.name);
      const routeString = `${start} → ${destination}`;
      
      setCurrentRoute(routeString);
      onRouteSet?.(routeString);

      showGlobalSuccess('Route Assigned Successfully!', `You have been assigned to: ${routeString}`, {
        duration: 0,
        position: 'top',
        animation: 'slide-down',
        actions: [
          {
            label: 'OK',
            onPress: () => navigation.goBack(),
            style: 'default',
          },
        ],
      });
    } catch (error) {
      console.error("Error assigning route:", error);
      const message = error instanceof Error ? error.message : 'Failed to assign route. Please try again.';
      showGlobalError('Assignment Failed', message, {
        duration: 5000,
        position: 'top',
        animation: 'slide-down',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  /**
   * Activates an existing assigned route
   * Updates route context and navigates back
   */
  const handleActivateExistingRoute = () => {
    if (!assignedRoute) return;

    const { start, destination } = parseRouteName(assignedRoute.name);
    const routeString = `${start} → ${destination}`;
    
    setCurrentRoute(routeString);
    onRouteSet?.(routeString);

    showGlobalSuccess('Route Activated', `Route activated: ${routeString}`, {
      duration: 0,
      position: 'top',
      animation: 'slide-down',
      actions: [
        {
          label: 'OK',
          onPress: () => navigation.goBack(),
          style: 'default',
        },
      ],
    });
  };

  // ============================================================================
  // STYLES
  // ============================================================================

  const dynamicStyles = StyleSheet.create({
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
      paddingVertical: 4,
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    sectionSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
      lineHeight: 22,
    },
    routeCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    routeCardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 12,
      textAlign: 'center',
    },
    routeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    routeText2: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 8,
    },
    associationText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    associationText2: {
      fontWeight: 'bold',
      fontSize: 18,
      color: theme.textSecondary,
    },
    selectionCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    selectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    associationButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? theme.background : "#f8f8f8",
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    associationButtonSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '10',
    },
    associationButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    associationButtonPlaceholder: {
      color: theme.textSecondary,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    primaryButtonDisabled: {
      backgroundColor: theme.textSecondary + '40',
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? "#121212" : "#FFFFFF",
    },
    primaryButtonTextDisabled: {
      color: theme.textSecondary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },

  });

  // ============================================================================
  // RENDER LOGIC
  // ============================================================================

  // If driver already has an assigned route, show activation screen
  if (assignedRoute) {
    const { start, destination } = parseRouteName(assignedRoute.name);
    
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ScrollView>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.surface} 
        />
        <View style={dynamicStyles.container}>
          {/* Content */}
          <View style={dynamicStyles.content}>
            <Text style={dynamicStyles.sectionSubtitle}>
              {t('yourAssignedRouteMessage')}
            </Text>

            {/* Route Information Card */}
            <View style={dynamicStyles.routeCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon name="map-outline" size={22} color={theme.primary} style={{ marginRight: 8, marginBottom: 10 }} />
                <Text style={dynamicStyles.routeCardTitle}>{t('currentRoute')}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Icon name="navigate-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6, marginBottom: 7 }} />
                <Text style={dynamicStyles.routeText}>Route</Text>
              </View>
              <Text style={dynamicStyles.routeText2}>{start} → {destination}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 4 }}>
                <Icon name="people-outline" size={18} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={dynamicStyles.associationText2}>Taxi Association</Text>
              </View>
              <Text style={dynamicStyles.associationText}>{assignedRoute.taxiAssociation}</Text>
            </View>

            {/* Activation Button */}
            <TouchableOpacity
              style={dynamicStyles.primaryButton}
              onPress={handleActivateExistingRoute}
            >
              <Text style={dynamicStyles.primaryButtonText}>{t('activateRoute')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // If driver doesn't have an assigned route yet, show assignment screen
  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.surface} 
      />
      <View style={dynamicStyles.container}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerLeft}>
            <TouchableOpacity 
              style={dynamicStyles.backButton}
              onPress={() => navigation.goBack()}
              testID="back-button"
            >
              <Icon name="arrow-back" size={24} color={isDark ? "#121212" : "#FF9900"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={dynamicStyles.content}>
          <Text style={dynamicStyles.sectionTitle}>{t('routeAssignment')}</Text>
          <Text style={dynamicStyles.sectionSubtitle}>
            {t('selectTaxiAssociationMessage')}
          </Text>

          {/* Taxi Association Selection */}
          <View style={dynamicStyles.selectionCard}>
            <Text style={dynamicStyles.selectionTitle}>{t('selectTaxiAssociation')}</Text>
            
            {!allTaxiAssociations ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <LoadingSpinner size="small" />
              </View>
            ) : allTaxiAssociations.map((association: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  dynamicStyles.associationButton,
                  taxiAssociation === association && dynamicStyles.associationButtonSelected
                ]}
                onPress={() => setTaxiAssociation(association)}
              >
                <Text style={dynamicStyles.associationButtonText}>{association}</Text>
                {taxiAssociation === association && (
                  <Icon name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Assignment Button */}
          <TouchableOpacity
            style={[
              dynamicStyles.primaryButton,
              (!taxiAssociation || isAssigning) && dynamicStyles.primaryButtonDisabled
            ]}
            onPress={handleAssignRoute}
            disabled={!taxiAssociation || isAssigning}
          >
            {isAssigning ? (
              <View style={dynamicStyles.loadingContainer}>
                <LoadingSpinner size="small" />
                <Text style={dynamicStyles.loadingText}>{t('assigningRoute')}</Text>
              </View>
            ) : (
              <Text style={[
                dynamicStyles.primaryButtonText,
                (!taxiAssociation || isAssigning) && dynamicStyles.primaryButtonTextDisabled
              ]}>
                {t('getMyRoute')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}