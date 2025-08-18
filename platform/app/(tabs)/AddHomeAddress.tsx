import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
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
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            backgroundColor: theme.background,
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 40,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 20,
            marginBottom: 30,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 28,
            fontWeight: '600',
            color: theme.text,
            flex: 1,
        },
        sectionHeader: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 8,
            paddingHorizontal: 4,
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            overflow: 'hidden',
        },
        fieldContainer: {
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        lastField: {
            borderBottomWidth: 0,
        },
        label: {
            fontSize: 17,
            fontWeight: '400',
            color: theme.text,
            marginBottom: 8,
        },
        input: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: 8,
            paddingHorizontal: 15,
            paddingVertical: 12,
            fontSize: 17,
            borderWidth: 0,
            color: theme.text,
        },
        addressInput: {
            minHeight: 80,
            textAlignVertical: 'top',
        },
        locationButtonContainer: {
            marginTop: 12,
        },
        locationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderRadius: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
        },
        locationButtonDisabled: {
            opacity: 0.6,
        },
        locationIconContainer: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        locationButtonText: {
            color: theme.text,
            fontWeight: '400',
            fontSize: 17,
            flex: 1,
        },
        buttonSection: {
            marginTop: 8,
        },
        buttonContainer: {
            backgroundColor: theme.card,
            borderRadius: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            overflow: 'hidden',
        },
        saveButton: {
            backgroundColor: theme.primary,
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            borderRadius: 16,
        },
        deleteButton: {
            backgroundColor: 'transparent',
            paddingVertical: 16,
            paddingHorizontal: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: isDark ? "#121212" : "#FFFFFF",
            fontWeight: 'bold',
            fontSize: 16,
        },
        deleteButtonText: {
            color: '#FF3B30',
            fontWeight: '400',
            fontSize: 17,
        },
        buttonIcon: {
            marginRight: 8,
        },
    });

    if (!user) {
        return (
            <SafeAreaView style={dynamicStyles.safeArea}>
                <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: theme.text, fontSize: 16 }}>{t('personalInfo:loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView 
                contentContainerStyle={dynamicStyles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={dynamicStyles.header}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.push('/(tabs)/PassengerProfile')}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>
                        {hasExistingAddress ? t('address:editHomeAddress') : t('address:addHomeAddress')}
                    </Text>
                </View>

                {/* Address Information Section */}
                <Text style={dynamicStyles.sectionHeader}>{t('address:addressInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('address:addressNickname')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="e.g., Home, House, Apartment"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={[dynamicStyles.fieldContainer, dynamicStyles.lastField]}>
                        <Text style={dynamicStyles.label}>{t('address:fullAddress')}</Text>
                        <TextInput
                            style={[dynamicStyles.input, dynamicStyles.addressInput]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter your home address"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                {/* Location Section */}
                <Text style={dynamicStyles.sectionHeader}>{t('address:location')}</Text>
                <View style={dynamicStyles.locationButtonContainer}>
                    <Pressable
                        style={[dynamicStyles.locationButton, isLoadingLocation && dynamicStyles.locationButtonDisabled]}
                        onPress={getCurrentLocation}
                        disabled={isLoadingLocation}
                        android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    >
                        <View style={dynamicStyles.locationIconContainer}>
                            <Ionicons 
                                name={isLoadingLocation ? "hourglass" : "location-outline"} 
                                size={20} 
                                color="#FF8C00" 
                            />
                        </View>
                        <Text style={dynamicStyles.locationButtonText}>
                            {isLoadingLocation ? t('home:gettingLocation') : t('home:useCurrentLocation')}
                        </Text>
                        <Ionicons 
                            name="chevron-forward" 
                            size={16} 
                            color={isDark ? theme.border : '#C7C7CC'} 
                        />
                    </Pressable>
                </View>

                {/* Action Buttons Section */}
                <Text style={dynamicStyles.sectionHeader}>{t('address:actions')}</Text>
                <View style={dynamicStyles.buttonSection}>
                    <View style={dynamicStyles.buttonContainer}>
                        <Pressable
                            style={[dynamicStyles.saveButton, isLoading && dynamicStyles.buttonDisabled]}
                            onPress={handleSave}
                            disabled={isLoading}
                            android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                        >
                            <Ionicons 
                                name="checkmark" 
                                size={20} 
                                color={isDark ? "#121212" : "#FFFFFF"} 
                                style={dynamicStyles.buttonIcon}
                            />
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
                                    style={dynamicStyles.buttonIcon}
                                />
                                <Text style={dynamicStyles.deleteButtonText}>{t('address:delete')}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}