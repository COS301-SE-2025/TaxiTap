import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertHelpers } from '../components/AlertHelpers';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Id } from '../convex/_generated/dataModel';

export default function VehicleDriver() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();
    
    // Hardcoded translations
    const translations = {
        en: {
            permissionDenied: "Permission Denied",
            mediaLibraryAccess: "We need access to your media library to upload a photo.",
            userNotFound: "Not found",
            userNotLoaded: "User not loaded.",
            invalidSeats: "Invalid Seats",
            maxSeatsAllowed: "Maximum 14 seats are allowed for taxis.",
            success: "Success",
            vehicleInfoUpdated: "Vehicle information updated successfully.",
            error: "Error",
            failedToUpdateVehicle: "Failed to update vehicle information.",
            loadingUserData: "Loading user data...",
            vehicleInformation: "Vehicle Information",
            updateTaxiDetails: "Update your taxi details",
            vehicleDetails: "Vehicle Details",
            vehicleType: "Vehicle Type",
            vehicleTypePlaceholder: "e.g., Toyota Camry",
            licensePlate: "License Plate",
            licensePlatePlaceholder: "e.g., ABC 123 GP",
            color: "Color",
            colorPlaceholder: "e.g., White",
            year: "Year",
            yearPlaceholder: "e.g., 2020",
            totalSeats: "Total Seats",
            seatsPlaceholder: "e.g., 4",
            vehiclePhoto: "Vehicle Photo",
            uploadVehiclePhoto: "Upload Vehicle Photo",
            saveChanges: "Save Changes"
        },
        tn: {
            permissionDenied: "Tumelo e Gannwe",
            mediaLibraryAccess: "Re tlhoka phihlelelo ya media library ya gago go tsaya setshwantsho.",
            userNotFound: "Ga e Bonwe",
            userNotLoaded: "Mosebenzisi ga a layishwe.",
            invalidSeats: "Dithulo tse di sa Siame",
            maxSeatsAllowed: "Dithulo tse di ka nang le 14 fela di letlelelwa mo ditekising.",
            success: "Katlego",
            vehicleInfoUpdated: "Tshedimosetso ya koloi e ntshitswe ka katlego.",
            error: "Phoso",
            failedToUpdateVehicle: "Go hlolekile go ntsha tshedimosetso ya koloi.",
            loadingUserData: "Go layishwa tshedimosetso ya mosebenzisi...",
            vehicleInformation: "Tshedimosetso ya Koloi",
            updateTaxiDetails: "Ntsha tshedimosetso ya tekisi ya gago",
            vehicleDetails: "Tshedimosetso ya Koloi",
            vehicleType: "Mofuta wa Koloi",
            vehicleTypePlaceholder: "mme., Toyota Camry",
            licensePlate: "Plate ya Tumelo",
            licensePlatePlaceholder: "mme., ABC 123 GP",
            color: "Mmala",
            colorPlaceholder: "mme., Bosweu",
            year: "Ngwaga",
            yearPlaceholder: "mme., 2020",
            totalSeats: "Dithulo Tsotlhe",
            seatsPlaceholder: "mme., 4",
            vehiclePhoto: "Setshwantsho sa Koloi",
            uploadVehiclePhoto: "Tsaya Setshwantsho sa Koloi",
            saveChanges: "Boloka Diphetogo"
        },
        zu: {
            permissionDenied: "Imvume Iyenqatshwe",
            mediaLibraryAccess: "Sidinga ukufinyelela ku-media library yakho ukuze ulayishe isithombe.",
            userNotFound: "Akutholakali",
            userNotLoaded: "Umsebenzisi akalayishwanga.",
            invalidSeats: "Izihlalo Ezingalungile",
            maxSeatsAllowed: "Izihlalo ezingama-14 kuphela zivunyelwe kumatekisi.",
            success: "Impumelelo",
            vehicleInfoUpdated: "Ulwazi lwemoto luvuselelwe ngempumelelo.",
            error: "Iphutha",
            failedToUpdateVehicle: "Kuhlulekile ukuvuselela ulwazi lwemoto.",
            loadingUserData: "Kulayishwa ulwazi lomsebenzisi...",
            vehicleInformation: "Ulwazi Lwemoto",
            updateTaxiDetails: "Vuselela imininingwane yakho yetekisi",
            vehicleDetails: "Imininingwane Yemoto",
            vehicleType: "Uhlobo Lwemoto",
            vehicleTypePlaceholder: "isb., Toyota Camry",
            licensePlate: "I-License Plate",
            licensePlatePlaceholder: "isb., ABC 123 GP",
            color: "Umbala",
            colorPlaceholder: "isb., Okumhlophe",
            year: "Unyaka",
            yearPlaceholder: "isb., 2020",
            totalSeats: "Zonke Izihlalo",
            seatsPlaceholder: "isb., 4",
            vehiclePhoto: "Isithombe Semoto",
            uploadVehiclePhoto: "Layisha Isithombe Semoto",
            saveChanges: "Londoloza Izinguquko"
        },
        af: {
            permissionDenied: "Toestemming Geweier",
            mediaLibraryAccess: "Ons het toegang tot jou media biblioteek nodig om 'n foto op te laai.",
            userNotFound: "Nie Gevind Nie",
            userNotLoaded: "Gebruiker nie gelaai nie.",
            invalidSeats: "Ongeldige Sitplekke",
            maxSeatsAllowed: "Maksimum 14 sitplekke word toegelaat vir taxis.",
            success: "Sukses",
            vehicleInfoUpdated: "Voertuig inligting suksesvol opgedateer.",
            error: "Fout",
            failedToUpdateVehicle: "Kon nie voertuig inligting opdateer nie.",
            loadingUserData: "Laai gebruiker data...",
            vehicleInformation: "Voertuig Inligting",
            updateTaxiDetails: "Dateer jou taxi besonderhede op",
            vehicleDetails: "Voertuig Besonderhede",
            vehicleType: "Voertuig Tipe",
            vehicleTypePlaceholder: "bv., Toyota Camry",
            licensePlate: "Lisensie Plaat",
            licensePlatePlaceholder: "bv., ABC 123 GP",
            color: "Kleur",
            colorPlaceholder: "bv., Wit",
            year: "Jaar",
            yearPlaceholder: "bv., 2020",
            totalSeats: "Totale Sitplekke",
            seatsPlaceholder: "bv., 4",
            vehiclePhoto: "Voertuig Foto",
            uploadVehiclePhoto: "Laai Voertuig Foto Op",
            saveChanges: "Stoor Veranderinge"
        }
    };
    
    const t = (key: string) => {
        const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
        return translations[lang][key as keyof typeof translations[typeof lang]] || key;
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
                showGlobalError(t('permissionDenied'), t('mediaLibraryAccess'), {
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
            showGlobalError(t('userNotFound'), t('userNotLoaded'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        // Validate seats - maximum 14 seats allowed
        const seatsNumber = parseInt(seats, 10);
        if (seatsNumber > 14) {
            showGlobalError(t('invalidSeats'), t('maxSeatsAllowed'), {
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
            showGlobalSuccess(t('success'), t('vehicleInfoUpdated'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        } catch (error) {
            console.error('Failed to update vehicle info:', error);
            showGlobalError(t('error'), t('failedToUpdateVehicle'), {
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
                    <Text style={{ color: theme.text, fontSize: 16 }}>{t('loadingUserData')}</Text>
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
                    <Text style={dynamicStyles.headerTitle}>{t('vehicleInformation')}</Text>
                    <Text style={dynamicStyles.headerSubtitle}>{t('updateTaxiDetails')}</Text>
                </View>

                {/* Vehicle Details Form */}
                <Text style={dynamicStyles.sectionHeader}>{t('vehicleDetails')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{t('vehicleType')}</Text>
                        <TextInput
                            value={vehicleType}
                            onChangeText={setVehicleType}
                            style={dynamicStyles.textInput}
                            placeholder={t('vehicleTypePlaceholder')}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{t('licensePlate')}</Text>
                        <TextInput
                            value={licensePlate}
                            onChangeText={setLicensePlate}
                            style={dynamicStyles.textInput}
                            placeholder={t('licensePlatePlaceholder')}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            autoCapitalize="characters"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{t('color')}</Text>
                        <TextInput
                            value={color}
                            onChangeText={setColor}
                            style={dynamicStyles.textInput}
                            placeholder={t('colorPlaceholder')}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{t('year')}</Text>
                        <TextInput
                            value={year}
                            onChangeText={setYear}
                            style={dynamicStyles.textInput}
                            placeholder={t('yearPlaceholder')}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={dynamicStyles.formField}>
                        <Text style={dynamicStyles.fieldLabel}>{t('totalSeats')}</Text>
                        <TextInput
                            value={seats}
                            onChangeText={setSeats}
                            style={dynamicStyles.textInput}
                            placeholder={t('seatsPlaceholder')}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Vehicle Photo Section */}
                <Text style={dynamicStyles.sectionHeader}>{t('vehiclePhoto')}</Text>
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
                            <Text style={dynamicStyles.uploadButtonText}>{t('uploadVehiclePhoto')}</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    onPress={handleSaveChanges}
                    style={dynamicStyles.saveButton}
                >
                    <Text style={dynamicStyles.saveButtonText}>{t('saveChanges')}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}