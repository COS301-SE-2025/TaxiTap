import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet, SafeAreaView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertHelpers } from '../components/AlertHelpers';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Id } from '../convex/_generated/dataModel';
import { useRouter, useNavigation } from 'expo-router';

export default function VehicleDriver() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const router = useRouter();
    const navigation = useNavigation();

    // Screen dimensions for responsive design
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const isSmallScreen = screenWidth < 375;
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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

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

        // Validate seats - maximum 14 seats allowed
        const seatsNumber = parseInt(seats, 10);
        if (seatsNumber > 14) {
            showGlobalError("Invalid Seats", "Maximum 14 seats are allowed for taxis.", {
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
                capacity: seatsNumber,
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
        header: {
            paddingHorizontal: isSmallScreen ? 16 : 20,
            paddingTop: Platform.OS === 'ios' ? 50 : 16,
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
            fontSize: 22,
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
            fontSize: 13,
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
            fontSize: 13,
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
            fontSize: 13,
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
            {/* Header */}
            <View style={dynamicStyles.header}>
                <View style={dynamicStyles.headerRow}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>
                        {currentLanguage === 'zu' ? 'Ulwazi Lwemoto' :
                         currentLanguage === 'tn' ? 'Tshedimosetso ya Koloi' :
                         currentLanguage === 'af' ? 'Voertuig Inligting' :
                         'Vehicle Information'}
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={dynamicStyles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Vehicle Details Form */}
                <Text style={dynamicStyles.sectionHeader}>
                    {currentLanguage === 'zu' ? 'Imininingwane Yemoto' :
                     currentLanguage === 'tn' ? 'Dintlha tsa Koloi' :
                     currentLanguage === 'af' ? 'Voertuig Besonderhede' :
                     'Vehicle Details'}
                </Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>
                            {currentLanguage === 'zu' ? 'Uhlobo Lwemoto' :
                             currentLanguage === 'tn' ? 'Mofuta wa Koloi' :
                             currentLanguage === 'af' ? 'Voertuig Tipe' :
                             'Vehicle Type'}
                        </Text>
                        <TextInput
                            value={vehicleType}
                            onChangeText={setVehicleType}
                            style={dynamicStyles.textInput}
                            placeholder={currentLanguage === 'zu' ? 'isib., Toyota Camry' :
                                       currentLanguage === 'tn' ? 'sekai, Toyota Camry' :
                                       currentLanguage === 'af' ? 'bv., Toyota Camry' :
                                       'e.g., Toyota Camry'}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>
                            {currentLanguage === 'zu' ? 'Inombolo Yokuqeqesha' :
                             currentLanguage === 'tn' ? 'Nomoro ya Laesense' :
                             currentLanguage === 'af' ? 'Lisensie Plaat' :
                             'License Plate'}
                        </Text>
                        <TextInput
                            value={licensePlate}
                            onChangeText={setLicensePlate}
                            style={dynamicStyles.textInput}
                            placeholder={currentLanguage === 'zu' ? 'isib., ABC 123 GP' :
                                       currentLanguage === 'tn' ? 'sekai, ABC 123 GP' :
                                       currentLanguage === 'af' ? 'bv., ABC 123 GP' :
                                       'e.g., ABC 123 GP'}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>
                            {currentLanguage === 'zu' ? 'Umbala' :
                             currentLanguage === 'tn' ? 'Mmala' :
                             currentLanguage === 'af' ? 'Kleur' :
                             'Color'}
                        </Text>
                        <TextInput
                            value={color}
                            onChangeText={setColor}
                            style={dynamicStyles.textInput}
                            placeholder={currentLanguage === 'zu' ? 'isib., Mhlophe' :
                                       currentLanguage === 'tn' ? 'sekai, Tshweu' :
                                       currentLanguage === 'af' ? 'bv., Wit' :
                                       'e.g., White'}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>
                            {currentLanguage === 'zu' ? 'Unyaka' :
                             currentLanguage === 'tn' ? 'Ngwaga' :
                             currentLanguage === 'af' ? 'Jaar' :
                             'Year'}
                        </Text>
                        <TextInput
                            value={year}
                            onChangeText={setYear}
                            style={dynamicStyles.textInput}
                            placeholder={currentLanguage === 'zu' ? 'isib., 2020' :
                                       currentLanguage === 'tn' ? 'sekai, 2020' :
                                       currentLanguage === 'af' ? 'bv., 2020' :
                                       'e.g., 2020'}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>
                            {currentLanguage === 'zu' ? 'Izihlalo Eziphelele' :
                             currentLanguage === 'tn' ? 'Ditulo Tsotlhe' :
                             currentLanguage === 'af' ? 'Totale Sitplekke' :
                             'Total Seats'}
                        </Text>
                        <TextInput
                            value={seats}
                            onChangeText={setSeats}
                            style={dynamicStyles.textInput}
                            placeholder={currentLanguage === 'zu' ? 'isib., 4' :
                                       currentLanguage === 'tn' ? 'sekai, 4' :
                                       currentLanguage === 'af' ? 'bv., 4' :
                                       'e.g., 4'}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Vehicle Photo Section */}
                <Text style={dynamicStyles.sectionHeader}>
                    {currentLanguage === 'zu' ? 'Isithombe Semoto' :
                     currentLanguage === 'tn' ? 'Setshwantsho sa Koloi' :
                     currentLanguage === 'af' ? 'Voertuig Foto' :
                     'Vehicle Photo'}
                </Text>
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
                            <Text style={dynamicStyles.uploadButtonText}>
                                {currentLanguage === 'zu' ? 'Layisha Isithombe Semoto' :
                                 currentLanguage === 'tn' ? 'Tsenya Setshwantsho sa Koloi' :
                                 currentLanguage === 'af' ? 'Laai Voertuig Foto Op' :
                                 'Upload Vehicle Photo'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    onPress={handleSaveChanges}
                    style={dynamicStyles.saveButton}
                >
                    <Text style={dynamicStyles.saveButtonText}>
                        {currentLanguage === 'zu' ? 'Gcina Izinguquko' :
                         currentLanguage === 'tn' ? 'Boloka Diphetogo' :
                         currentLanguage === 'af' ? 'Stoor Veranderinge' :
                         'Save Changes'}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}