import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlertHelpers } from '../../components/AlertHelpers';
import * as Location from 'expo-location';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export default function AddHomeAddress() {
    const [address, setAddress] = useState('');
    const [nickname, setNickname] = useState('Home');
    const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingAddress, setHasExistingAddress] = useState(false);

    const router = useRouter();
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { t } = useLanguage();
    const { showGlobalError, showGlobalSuccess, showConfirm } = useAlertHelpers();
    
    // Screen dimensions for responsive design
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const isSmallScreen = screenWidth < 375;
    const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
    const isLargeScreen = screenWidth >= 414;

    // Query user data from Convex
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Mutation to update home address
    const updateHomeAddress = useMutation(api.functions.users.UserManagement.updateHomeAddress.updateHomeAddress);
    

    // Initialize with existing home address if available
    useEffect(() => {
        if (convexUser && convexUser.homeAddress) {
            setAddress(convexUser.homeAddress.address);
            setNickname(convexUser.homeAddress.nickname || 'Home');
            setCoordinates(convexUser.homeAddress.coordinates);
            setHasExistingAddress(true);
        }
    }, [convexUser]);

    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showGlobalError(
                    t('address:permissionDenied'),
                    t('address:locationPermissionRequired'),
                    { duration: 4000 }
                );
                return;
            }

            // Get current location
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            setCoordinates({ latitude, longitude });

            // Reverse geocode to get address
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            if (reverseGeocode.length > 0) {
                const result = reverseGeocode[0];
                const fullAddress = `${result.name || ''} ${result.street || ''}, ${result.city || ''}, ${result.region || ''} ${result.postalCode || ''}`.trim();
                setAddress(fullAddress);
            }
        } catch (error) {
            console.error('Location error:', error);
            showGlobalError(
                t('address:error'),
                t('address:failedToGetLocation'),
                { duration: 4000 }
            );
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            showGlobalError(
                t('address:error'),
                t('address:userNotLoaded'),
                { duration: 4000 }
            );
            return;
        }
        if (!address.trim()) {
            showGlobalError(
                t('address:error'),
                t('address:addressRequired'),
                { duration: 4000 }
            );
            return;
        }
        if (!nickname.trim()) {
            showGlobalError(
                t('address:error'),
                t('address:nicknameRequired'),
                { duration: 4000 }
            );
            return;
        }
        if (coordinates.latitude === 0 && coordinates.longitude === 0) {
            showGlobalError(
                t('address:error'),
                t('address:coordinatesRequired'),
                { duration: 4000 }
            );
            return;
        }
        setIsLoading(true);
        try {
            await updateHomeAddress({
                userId: user.id as Id<'taxiTap_users'>,
                homeAddress: {
                    address: address.trim(),
                    nickname: nickname.trim(),
                    coordinates,
                },
            });
            showGlobalSuccess(
                t('address:success'),
                t('address:homeAddressSaved'),
                { duration: 2000 }
            );
            setTimeout(() => {
                router.push('/(tabs)/PassengerProfile');
            }, 2000);
        } catch (error: any) {
            console.error('Save error:', error);
            showGlobalError(
                t('address:error'),
                error.message || t('address:failedToSaveAddress'),
                { duration: 4000 }
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            showGlobalError(
                t('address:error'),
                t('address:userNotLoaded'),
                { duration: 4000 }
            );
            return;
        }
        
        showConfirm(
            t('address:deleteHomeAddress'),
            t('address:deleteAddressConfirm'),
            async () => {
                try {
                    setIsLoading(true);
                    await updateHomeAddress({
                        userId: user.id as Id<'taxiTap_users'>,
                        homeAddress: null,
                    });
                    showGlobalSuccess(
                        t('address:success'),
                        t('address:homeAddressDeleted'),
                        { duration: 2000 }
                    );
                    setTimeout(() => {
                        router.push('/(tabs)/PassengerProfile');
                    }, 2000);
                } catch (error: any) {
                    console.error('Delete error:', error);
                    showGlobalError(
                        t('address:error'),
                        error.message || t('address:failedToDeleteAddress'),
                        { duration: 4000 }
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            undefined,
            t('address:delete'),
            t('address:cancel')
        );
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        header: {
            paddingHorizontal: isSmallScreen ? 16 : 20,
            paddingTop: Platform.OS === 'ios' ? (screenHeight > 800 ? 80 : 70) : 60,
            paddingBottom: 20,
            backgroundColor: theme.background,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        backButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
            flex: 1,
        },
        content: {
            flex: 1,
            paddingHorizontal: isSmallScreen ? 16 : 20,
            paddingTop: 16,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 16,
            marginTop: 8,
        },
        card: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: isSmallScreen ? 12 : 16,
            marginBottom: isSmallScreen ? 12 : 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            // iOS-style shadows for both platforms
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 4,
        },
        fieldContainer: {
            marginBottom: 20,
        },
        lastField: {
            marginBottom: 0,
        },
        label: {
            fontSize: 15,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 8,
            lineHeight: 20,
        },
        input: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: theme.text,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        addressInput: {
            minHeight: 80,
            textAlignVertical: 'top',
        },
        locationCard: {
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
            // iOS-style shadows for both platforms
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 4,
        },
        locationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
        },
        locationButtonDisabled: {
            opacity: 0.6,
        },
        locationIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        locationButtonText: {
            color: theme.text,
            fontWeight: '500',
            fontSize: 16,
            flex: 1,
            lineHeight: 20,
        },
        locationSubtext: {
            fontSize: 13,
            color: theme.textSecondary,
            marginTop: 2,
        },
        buttonCard: {
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
            // iOS-style shadows for both platforms
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 4,
        },
        saveButton: {
            backgroundColor: theme.primary,
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
        },
        deleteButton: {
            backgroundColor: 'transparent',
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: isDark ? "#121212" : "#FFFFFF",
            fontWeight: '600',
            fontSize: 16,
            marginLeft: 8,
        },
        deleteButtonText: {
            color: '#FF3B30',
            fontWeight: '500',
            fontSize: 16,
            marginLeft: 8,
        },
        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 80,
        },
        loadingText: {
            fontSize: 14,
            color: theme.textSecondary,
            marginTop: 16,
            textAlign: 'center',
        },
    });

    if (!user) {
        return (
            <View style={dynamicStyles.container}>
                <View style={dynamicStyles.loadingContainer}>
                    <LoadingSpinner size="large" />
                </View>
            </View>
        );
    }

    return (
        <View style={dynamicStyles.container}>
            {/* Header */}
            <View style={dynamicStyles.header}>
                <View style={dynamicStyles.headerRow}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.push('/(tabs)/PassengerProfile')}>
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>
                        {hasExistingAddress ? t('address:editHomeAddress') : t('address:addHomeAddress')}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View style={dynamicStyles.content}>
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ 
                        paddingBottom: Platform.OS === 'ios' ? 40 : 20 
                    }}
                >

                {/* Address Information Section */}
                <Text style={dynamicStyles.sectionTitle}>{t('address:addressInformation')}</Text>
                <View style={dynamicStyles.card}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('address:addressNickname')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="e.g., Home, House, Apartment"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={[dynamicStyles.fieldContainer, dynamicStyles.lastField]}>
                        <Text style={dynamicStyles.label}>{t('address:fullAddress')}</Text>
                        <TextInput
                            style={[dynamicStyles.input, dynamicStyles.addressInput]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter your home address"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                {/* Location Section */}
                <Text style={dynamicStyles.sectionTitle}>{t('address:location')}</Text>
                <View style={dynamicStyles.locationCard}>
                    <Pressable
                        style={[dynamicStyles.locationButton, isLoadingLocation && dynamicStyles.locationButtonDisabled]}
                        onPress={getCurrentLocation}
                        disabled={isLoadingLocation}
                        android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    >
                        <View style={dynamicStyles.locationIconContainer}>
                            {isLoadingLocation ? (
                                <LoadingSpinner size="small" />
                            ) : (
                                <Ionicons 
                                    name="location-outline" 
                                    size={20} 
                                    color={theme.primary} 
                                />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={dynamicStyles.locationButtonText}>
                                {isLoadingLocation ? t('home:gettingLocation') : t('home:useCurrentLocation')}
                            </Text>
                            <Text style={dynamicStyles.locationSubtext}>
                                {isLoadingLocation 
                                    ? 'Please wait while we get your location...'
                                    : 'Automatically fill address from GPS location'
                                }
                            </Text>
                        </View>
                        <Ionicons 
                            name="chevron-forward" 
                            size={16} 
                            color={theme.textSecondary} 
                        />
                    </Pressable>
                </View>

                {/* Action Buttons Section */}
                <Text style={dynamicStyles.sectionTitle}>{t('address:actions')}</Text>
                <View style={dynamicStyles.buttonCard}>
                    <Pressable
                        style={[dynamicStyles.saveButton, isLoading && dynamicStyles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                        android_ripple={{ color: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
                    >
                        {isLoading ? (
                            <LoadingSpinner size="small" />
                        ) : (
                            <Ionicons 
                                name="checkmark" 
                                size={20} 
                                color={isDark ? "#121212" : "#FFFFFF"} 
                            />
                        )}
                        <Text style={dynamicStyles.saveButtonText}>
                            {isLoading ? t('address:saving') : hasExistingAddress ? t('address:updateAddress') : t('address:saveAddress')}
                        </Text>
                    </Pressable>

                    {hasExistingAddress && (
                        <Pressable
                            style={[dynamicStyles.deleteButton, isLoading && dynamicStyles.buttonDisabled]}
                            onPress={handleDelete}
                            disabled={isLoading}
                            android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                        >
                            <Ionicons 
                                name="trash-outline" 
                                size={20} 
                                color="#FF3B30" 
                            />
                            <Text style={dynamicStyles.deleteButtonText}>{t('address:delete')}</Text>
                        </Pressable>
                    )}
                </View>
                </ScrollView>
            </View>
        </View>
    );
}