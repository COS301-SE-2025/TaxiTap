import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertHelpers } from '../components/AlertHelpers';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { Id } from '../convex/_generated/dataModel';

export default function VehicleDriver() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();
    const [vehicleType, setVehicleType] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [seats, setSeats] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [color, setColor] = useState('');
    const [year, setYear] = useState('');

    // Use 'skip' instead of undefined to avoid type error, and cast user.id to Id<"taxiTap_users"> for Convex
    const taxiData = useQuery(
        api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
        user ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );
    const updateTaxi = useMutation(api.functions.taxis.updateTaxiInfo.updateTaxiInfo);

    useEffect(() => {
        if (taxiData) {
            setVehicleType(taxiData.model);
            setLicensePlate(taxiData.licensePlate);
            setSeats(taxiData.capacity.toString());
            setImageUri(taxiData.image || null);
            setColor(taxiData.color);
            setYear(taxiData.year.toString());
        }
    }, [taxiData]);

    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showGlobalError('Permission Denied', 'We need access to your media library to upload a photo.', {
                    duration: 4000,
                    position: 'top',
                    animation: 'slide-down',
                });
            }
        })();
    }, []);

    const handleUploadPhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 1,
                aspect: [16, 9],
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                console.log('Selected image URI:', uri);
                setImageUri(uri);
            }
        } catch (error) {
            console.error('Image upload error:', error);
        }
    };

    const handleSaveChanges = async () => {
        if (!user) {
            showGlobalError("Not found", "User not loaded.", {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }
        try {
            await updateTaxi({
                userId: user.id as Id<"taxiTap_users">,
                model: vehicleType,
                licensePlate,
                capacity: parseInt(seats, 10),
                image: imageUri || undefined,
                color,
                year: parseInt(year, 10)
            });
            showGlobalSuccess("Success", "Vehicle information updated successfully.", {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        } catch (error) {
            console.error('Failed to update vehicle info:', error);
            showGlobalError("Error", "Failed to update vehicle information.", {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        }
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
        headerSection: {
            alignItems: 'center',
            paddingVertical: 32,
            marginBottom: 24,
        },
        headerTitle: {
            fontSize: 28,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        headerSubtitle: {
            fontSize: 16,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            fontWeight: '500',
            textAlign: 'center',
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            overflow: 'hidden',
            padding: 20,
        },
        sectionHeader: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 16,
            marginTop: 8,
            paddingHorizontal: 4,
        },
        formField: {
            marginBottom: 20,
        },
        fieldLabel: {
            fontSize: 15,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 8,
        },
        textInput: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: theme.text,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        imageSection: {
            alignItems: 'center',
            marginTop: 20,
        },
        vehicleImage: {
            width: '100%',
            height: 200,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            marginBottom: 16,
        },
        uploadButton: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        uploadButtonText: {
            color: theme.text,
            fontWeight: '600',
            fontSize: 16,
            marginLeft: 8,
        },
        saveButton: {
            backgroundColor: '#f90',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 20,
        },
        saveButtonText: {
            color: 'white',
            fontWeight: '600',
            fontSize: 16,
        },
    });

    if (!user) {
        return (
            <SafeAreaView style={dynamicStyles.safeArea}>
                <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: theme.text, fontSize: 16 }}>Loading user data...</Text>
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
                {/* Header Section */}
                <View style={dynamicStyles.headerSection}>
                    <Text style={dynamicStyles.headerTitle}>Vehicle Information</Text>
                    <Text style={dynamicStyles.headerSubtitle}>Update your taxi details</Text>
                </View>

                {/* Vehicle Details Form */}
                <Text style={dynamicStyles.sectionHeader}>Vehicle Details</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>Vehicle Type</Text>
                        <TextInput
                            value={vehicleType}
                            onChangeText={setVehicleType}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., Toyota Camry"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>License Plate</Text>
                        <TextInput
                            value={licensePlate}
                            onChangeText={setLicensePlate}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., ABC 123 GP"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>Color</Text>
                        <TextInput
                            value={color}
                            onChangeText={setColor}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., White"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>Year</Text>
                        <TextInput
                            value={year}
                            onChangeText={setYear}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., 2020"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>Total Seats</Text>
                        <TextInput
                            value={seats}
                            onChangeText={setSeats}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., 4"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Vehicle Photo Section */}
                <Text style={dynamicStyles.sectionHeader}>Vehicle Photo</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.imageSection}>
                        <Image
                            source={
                                imageUri
                                    ? { uri: imageUri }
                                    : require('../assets/images/taxi.png')
                            }
                            style={dynamicStyles.vehicleImage}
                            resizeMode="cover"
                        />
                        <Pressable
                            onPress={handleUploadPhoto}
                            style={dynamicStyles.uploadButton}
                        >
                            <Ionicons name="camera" size={20} color={theme.text} />
                            <Text style={dynamicStyles.uploadButtonText}>Upload Vehicle Photo</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    onPress={handleSaveChanges}
                    style={dynamicStyles.saveButton}
                >
                    <Text style={dynamicStyles.saveButtonText}>Save Changes</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}