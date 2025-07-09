import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
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
                Alert.alert('Permission Denied', 'Location permission is required to get your current location');
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
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            Alert.alert('Error', 'User not loaded');
            return;
        }
        if (!address.trim()) {
            Alert.alert('Error', 'Please enter an address');
            return;
        }
        if (!nickname.trim()) {
            Alert.alert('Error', 'Please enter a nickname for this address');
            return;
        }
        if (coordinates.latitude === 0 && coordinates.longitude === 0) {
            Alert.alert('Error', 'Please get location coordinates or use current location');
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
            Alert.alert('Success', 'Home address saved successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Save error:', error);
            Alert.alert('Error', error.message || 'Failed to save home address');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            Alert.alert('Error', 'User not loaded');
            return;
        }
        Alert.alert(
            'Delete Home Address',
            'Are you sure you want to delete your home address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            await updateHomeAddress({
                                userId: user.id as Id<'taxiTap_users'>,
                                homeAddress: null,
                            });
                            Alert.alert('Success', 'Home address deleted successfully!', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error: any) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', error.message || 'Failed to delete home address');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const dynamicStyles = StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            backgroundColor: theme.background,
            padding: 20,
            paddingBottom: 40,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 30,
        },
        backButton: {
            marginRight: 15,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.text,
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 4,
            borderWidth: isDark ? 1 : 0,
            borderColor: theme.border,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 15,
        },
        fieldContainer: {
            marginBottom: 15,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 5,
        },
        input: {
            backgroundColor: isDark ? theme.surface : '#fff',
            borderRadius: 8,
            paddingHorizontal: 15,
            paddingVertical: 12,
            fontSize: 16,
            borderColor: isDark ? theme.border : '#ddd',
            borderWidth: 1,
            color: theme.text,
        },
        addressInput: {
            minHeight: 80,
            textAlignVertical: 'top',
        },
        locationButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.primary,
            paddingVertical: 12,
            paddingHorizontal: 15,
            borderRadius: 8,
            marginTop: 10,
        },
        locationButtonDisabled: {
            opacity: 0.6,
        },
        locationButtonText: {
            color: isDark ? '#121212' : '#fff',
            fontWeight: '600',
            marginLeft: 8,
        },
        coordinatesContainer: {
            backgroundColor: isDark ? theme.surface : '#f8f9fa',
            borderRadius: 8,
            padding: 10,
            marginTop: 10,
        },
        coordinatesText: {
            fontSize: 12,
            color: theme.text,
            opacity: 0.7,
        },
        buttonContainer: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 20,
        },
        saveButton: {
            flex: 1,
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        deleteButton: {
            flex: 1,
            backgroundColor: '#FF3B30',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
        },
        buttonDisabled: {
            opacity: 0.6,
        },
        buttonText: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
        },
        saveButtonText: {
            color: isDark ? '#121212' : '#fff',
            fontWeight: 'bold',
            fontSize: 16,
        },
        infoBox: {
            backgroundColor: isDark ? theme.surface : '#e3f2fd',
            borderRadius: 8,
            padding: 15,
            marginBottom: 20,
        },
        infoText: {
            fontSize: 14,
            color: theme.text,
            opacity: 0.8,
        },
    });

    if (!user) {
        return (
            <SafeAreaView style={dynamicStyles.safeArea}>
                <View style={dynamicStyles.container}>
                    <Text style={{ color: theme.text }}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView contentContainerStyle={dynamicStyles.container}>
                {/* Header */}
                <View style={dynamicStyles.header}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>
                        {hasExistingAddress ? 'Edit Home Address' : 'Add Home Address'}
                    </Text>
                </View>

                {/* Info Box */}
                <View style={dynamicStyles.infoBox}>
                    <Text style={dynamicStyles.infoText}>
                        💡 Adding your home address will make it easier to book rides to and from home. 
                        You can use your current location or enter the address manually.
                    </Text>
                </View>

                {/* Address Form */}
                <View style={dynamicStyles.section}>
                    <Text style={dynamicStyles.sectionTitle}>Address Information</Text>
                    
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Address Nickname</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="e.g., Home, My Place"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Full Address</Text>
                        <TextInput
                            style={[dynamicStyles.input, dynamicStyles.addressInput]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter your home address"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            multiline
                            numberOfLines={3}
                        />
                        
                        <Pressable
                            style={[dynamicStyles.locationButton, isLoadingLocation && dynamicStyles.locationButtonDisabled]}
                            onPress={getCurrentLocation}
                            disabled={isLoadingLocation}
                        >
                            <Ionicons 
                                name={isLoadingLocation ? "hourglass" : "location"} 
                                size={20} 
                                color={isDark ? '#121212' : '#fff'} 
                            />
                            <Text style={dynamicStyles.locationButtonText}>
                                {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
                            </Text>
                        </Pressable>

                        {(coordinates.latitude !== 0 || coordinates.longitude !== 0) && (
                            <View style={dynamicStyles.coordinatesContainer}>
                                <Text style={dynamicStyles.coordinatesText}>
                                    Coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={dynamicStyles.buttonContainer}>
                    <Pressable
                        style={[dynamicStyles.saveButton, isLoading && dynamicStyles.buttonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        <Text style={dynamicStyles.saveButtonText}>
                            {isLoading ? 'Saving...' : hasExistingAddress ? 'Update Address' : 'Save Address'}
                        </Text>
                    </Pressable>

                    {hasExistingAddress && (
                        <Pressable
                            style={[dynamicStyles.deleteButton, isLoading && dynamicStyles.buttonDisabled]}
                            onPress={handleDelete}
                            disabled={isLoading}
                        >
                            <Text style={dynamicStyles.buttonText}>Delete</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}