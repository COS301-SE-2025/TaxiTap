import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertHelpers } from '../components/AlertHelpers';
import { useLanguage } from '../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { Id } from '../convex/_generated/dataModel';

export default function VehicleDriver() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();

    // Supported languages type
    type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

    // Hardcoded translations for all UI text
    const translations: Record<string, Record<SupportedLanguage, string>> = {
        permissionDenied: {
            en: "Permission Denied",
            zu: "Imvume Yenqatshwe",
            tn: "Tumello e Tlhaotswe",
            af: "Toestemming Geweier"
        },
        needMediaLibraryAccess: {
            en: "We need access to your media library to upload a photo.",
            zu: "Sidinga ukufinyelela kumtapo wakho wemidiya ukuze ulayishe isithombe.",
            tn: "Re tlhoka phihlelelo go mokgobokanyo wa gago wa media go tsaya setšhupo.",
            af: "Ons het toegang tot jou mediebiblioteek nodig om 'n foto op te laai."
        },
        userNotFound: {
            en: "Not found",
            zu: "Akutholakali",
            tn: "Ga a bonwe",
            af: "Nie gevind nie"
        },
        userNotLoaded: {
            en: "User not loaded.",
            zu: "Umsebenzisi akalayishwanga.",
            tn: "Modirisi ga a tsene.",
            af: "Gebruiker nie gelaai nie."
        },
        invalidSeats: {
            en: "Invalid Seats",
            zu: "Izihlalo Ezingalungile",
            tn: "Diseatulo tse di sa Tshwaneng",
            af: "Ongeldige Sitplekke"
        },
        maxSeatsAllowed: {
            en: "Maximum 14 seats are allowed for taxis.",
            zu: "Izihlalo eziyi-14 kuphela zivunyelwe eziteksini.",
            tn: "Diseatulo tse di ka nna 14 fela di letlwa mo ditekising.",
            af: "Maksimum 14 sitplekke word toegelaat vir taxis."
        },
        success: {
            en: "Success",
            zu: "Impumelelo",
            tn: "Katlego",
            af: "Sukses"
        },
        vehicleInfoUpdated: {
            en: "Vehicle information updated successfully.",
            zu: "Ulwazi lwemoto lubuyiswe ngempumelelo.",
            tn: "Tshedimosetso ya koloi e tokafaditswe ka katlego.",
            af: "Voertuiginligting suksesvol bygewerk."
        },
        error: {
            en: "Error",
            zu: "Iphutha",
            tn: "Phoso",
            af: "Fout"
        },
        failedToUpdateVehicle: {
            en: "Failed to update vehicle information.",
            zu: "Kuhlulekile ukubuyisa ulwazi lwemoto.",
            tn: "Ga go atlege go tokafatsa tshedimosetso ya koloi.",
            af: "Kon nie voertuiginligting bywerk nie."
        },
        vehicleInformation: {
            en: "Vehicle Information",
            zu: "Ulwazi Lwemoto",
            tn: "Tshedimosetso ya Koloi",
            af: "Voertuiginligting"
        },
        vehicleDetails: {
            en: "Vehicle Details",
            zu: "Imininingwane Yemoto",
            tn: "Mabaka a Koloi",
            af: "Voertuigbesonderhede"
        },
        vehicleType: {
            en: "Vehicle Type",
            zu: "Uhlobo Lwemoto",
            tn: "Mofuta wa Koloi",
            af: "Voertuigtipe"
        },
        licensePlate: {
            en: "License Plate",
            zu: "Iphepha Lelayisense",
            tn: "Phepha ya Laesense",
            af: "Kentekenplaat"
        },
        color: {
            en: "Color",
            zu: "Umbala",
            tn: "Mmala",
            af: "Kleur"
        },
        year: {
            en: "Year",
            zu: "Unyaka",
            tn: "Ngwaga",
            af: "Jaar"
        },
        totalSeats: {
            en: "Total Seats",
            zu: "Izihlalo Eziphelele",
            tn: "Diseatulo tse di Phelele",
            af: "Totale Sitplekke"
        },
        vehiclePhoto: {
            en: "Vehicle Photo",
            zu: "Isithombe Semoto",
            tn: "Setšhupo sa Koloi",
            af: "Voertuigfoto"
        },
        uploadVehiclePhoto: {
            en: "Upload Vehicle Photo",
            zu: "Layisha Isithombe Semoto",
            tn: "Tsaya Setšhupo sa Koloi",
            af: "Laai Voertuigfoto"
        },
        saveChanges: {
            en: "Save Changes",
            zu: "Gcina Izinguquko",
            tn: "Boloka Diphetogo",
            af: "Stoor Veranderinge"
        }
    } as const;

    // Type-safe translation getter
    const getTranslation = (key: keyof typeof translations) => {
        return translations[key][currentLanguage as SupportedLanguage];
    };
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
                showGlobalError(getTranslation('permissionDenied'), getTranslation('needMediaLibraryAccess'), {
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
            showGlobalError(getTranslation('userNotFound'), getTranslation('userNotLoaded'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        // Validate seats - maximum 14 seats allowed
        const seatsNumber = parseInt(seats, 10);
        if (seatsNumber > 14) {
            showGlobalError(getTranslation('invalidSeats'), getTranslation('maxSeatsAllowed'), {
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
            showGlobalSuccess(getTranslation('success'), getTranslation('vehicleInfoUpdated'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        } catch (error) {
            console.error('Failed to update vehicle info:', error);
            showGlobalError(getTranslation('error'), getTranslation('failedToUpdateVehicle'), {
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
                    <Text style={dynamicStyles.headerTitle}>{getTranslation('vehicleInformation')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>Update your taxi details</Text>
                </View>

                {/* Vehicle Details Form */}
                <Text style={dynamicStyles.sectionHeader}>{getTranslation('vehicleDetails')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{getTranslation('vehicleType')}</Text>
                        <TextInput
                            value={vehicleType}
                            onChangeText={setVehicleType}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., Toyota Camry"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{getTranslation('licensePlate')}</Text>
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
                        <Text style={dynamicStyles.fieldLabel}>{getTranslation('color')}</Text>
                        <TextInput
                            value={color}
                            onChangeText={setColor}
                            style={dynamicStyles.textInput}
                            placeholder="e.g., White"
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{getTranslation('year')}</Text>
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
                        <Text style={dynamicStyles.fieldLabel}>{getTranslation('totalSeats')}</Text>
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
                <Text style={dynamicStyles.sectionHeader}>{getTranslation('vehiclePhoto')}</Text>
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
                            <Text style={dynamicStyles.uploadButtonText}>{getTranslation('uploadVehiclePhoto')}</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    onPress={handleSaveChanges}
                    style={dynamicStyles.saveButton}
                >
                    <Text style={dynamicStyles.saveButtonText}>{getTranslation('saveChanges')}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}