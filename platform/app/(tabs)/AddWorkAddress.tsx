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
import { LoadingSpinner } from '../../components/LoadingSpinner';

export default function AddWorkAddress() {
    const [address, setAddress] = useState('');
    const [nickname, setNickname] = useState('Work');
    const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasExistingAddress, setHasExistingAddress] = useState(false);

    const router = useRouter();
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const { showGlobalError, showGlobalSuccess, showConfirm } = useAlertHelpers();

    // Supported languages type
    type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

    // Hardcoded translations for all UI text
    const translations: Record<string, Record<SupportedLanguage, string>> = {
        permissionDenied: {
            en: "Permission Denied",
            zu: "Imvume Ayinikeziwe",
            tn: "Tumelo ga e na",
            af: "Toestemming Geweier"
        },
        locationPermissionRequired: {
            en: "Location permission is required to get your current location.",
            zu: "Imvume yendawo iyadingeka ukuze uthole indawo yakho yamanje.",
            tn: "Tumelo ya lefelo e tlhoka go bona lefelo la gago la jaanong.",
            af: "Ligging toestemming word benodig om jou huidige ligging te kry."
        },
        error: {
            en: "Error",
            zu: "Iphutha",
            tn: "Phoso",
            af: "Fout"
        },
        failedToGetLocation: {
            en: "Failed to get your current location. Please try again.",
            zu: "Kuhlulekile ukuthola indawo yakho yamanje. Sicela uzame futhi.",
            tn: "Go hlolekile go bona lefelo la gago la jaanong. Ka kopo o leke gape.",
            af: "Kon jou huidige ligging kry nie. Probeer asseblief weer."
        },
        userNotLoaded: {
            en: "User information not loaded. Please try again.",
            zu: "Ulwazi lomsebenzisi alukalungi. Sicela uzame futhi.",
            tn: "Tshedimosetso ya mosebedisi ga e na. Ka kopo o leke gape.",
            af: "Gebruiker inligting nie gelaai nie. Probeer asseblief weer."
        },
        addressRequired: {
            en: "Address is required.",
            zu: "Ikheli liyadingeka.",
            tn: "Aterese e tlhoka.",
            af: "Adres word benodig."
        },
        nicknameRequired: {
            en: "Nickname is required.",
            zu: "Igama elithandwayo liyadingeka.",
            tn: "Leina le le ratiwang le tlhoka.",
            af: "Bynaam word benodig."
        },
        coordinatesRequired: {
            en: "Coordinates are required. Please use 'Use Current Location' to get them.",
            zu: "Izikhundla ziyadingeka. Sicela usebenzise 'Sebenzisa Indawo Yamanje' ukuze uzithole.",
            tn: "Ditlhaka di tlhoka. Ka kopo o dirise 'Dirisa Lefelo la Jaanong' go di bona.",
            af: "Koördinate word benodig. Gebruik asseblief 'Gebruik Huidige Ligging' om hulle te kry."
        },
        success: {
            en: "Success",
            zu: "Impumelelo",
            tn: "Katlego",
            af: "Sukses"
        },
        workAddressSaved: {
            en: "Work address saved successfully!",
            zu: "Ikheli lomsebenzi lisindisiwe ngempumelelo!",
            tn: "Aterese ya tiro e bolokilwe ka katlego!",
            af: "Werk adres suksesvol gestoor!"
        },
        failedToSaveAddress: {
            en: "Failed to save address. Please try again.",
            zu: "Kuhlulekile ukugcina ikheli. Sicela uzame futhi.",
            tn: "Go hlolekile go boloka aterese. Ka kopo o leke gape.",
            af: "Kon adres stoor nie. Probeer asseblief weer."
        },
        deleteWorkAddress: {
            en: "Delete Work Address",
            zu: "Susa Ikheli Lomsebenzi",
            tn: "Tlosa Aterese ya Tiro",
            af: "Skrap Werk Adres"
        },
        deleteAddressConfirm: {
            en: "Are you sure you want to delete your work address?",
            zu: "Uqinisekile ukuthi ufuna ukususa ikheli lakho lomsebenzi?",
            tn: "O kgotsofala gore o batla go tlosa aterese ya gago ya tiro?",
            af: "Is jy seker jy wil jou werk adres skrap?"
        },
        workAddressDeleted: {
            en: "Work address deleted successfully!",
            zu: "Ikheli lomsebenzi lisusiwe ngempumelelo!",
            tn: "Aterese ya tiro e tlosiwe ka katlego!",
            af: "Werk adres suksesvol geskrap!"
        },
        failedToDeleteAddress: {
            en: "Failed to delete address. Please try again.",
            zu: "Kuhlulekile ukususa ikheli. Sicela uzame futhi.",
            tn: "Go hlolekile go tlosa aterese. Ka kopo o leke gape.",
            af: "Kon adres skrap nie. Probeer asseblief weer."
        },
        delete: {
            en: "Delete",
            zu: "Susa",
            tn: "Tlosa",
            af: "Skrap"
        },
        cancel: {
            en: "Cancel",
            zu: "Khansela",
            tn: "Tlhokomolola",
            af: "Kanselleer"
        },
        editWorkAddress: {
            en: "Edit Work Address",
            zu: "Hlela Ikheli Lomsebenzi",
            tn: "Fetola Aterese ya Tiro",
            af: "Wysig Werk Adres"
        },
        addWorkAddress: {
            en: "Add Work Address",
            zu: "Engeza Ikheli Lomsebenzi",
            tn: "Tsenya Aterese ya Tiro",
            af: "Voeg Werk Adres By"
        },
        addressInformation: {
            en: "Address Information",
            zu: "Ulwazi Lwekheli",
            tn: "Tshedimosetso ya Aterese",
            af: "Adres Inligting"
        },
        addressNickname: {
            en: "Address Nickname",
            zu: "Igama Elithandwayo Lekheli",
            tn: "Leina le le Ratwang la Aterese",
            af: "Adres Bynaam"
        },
        fullAddress: {
            en: "Full Address",
            zu: "Ikheli Eligcwele",
            tn: "Aterese e Tletseng",
            af: "Volledige Adres"
        },
        location: {
            en: "Location",
            zu: "Indawo",
            tn: "Lefelo",
            af: "Ligging"
        },
        gettingLocation: {
            en: "Getting location...",
            zu: "Kutholakala indawo...",
            tn: "Go bona lefelo...",
            af: "Kry ligging..."
        },
        useCurrentLocation: {
            en: "Use Current Location",
            zu: "Sebenzisa Indawo Yamanje",
            tn: "Dirisa Lefelo la Jaanong",
            af: "Gebruik Huidige Ligging"
        },
        actions: {
            en: "Actions",
            zu: "Izenzo",
            tn: "Ditiro",
            af: "Aksies"
        },
        saving: {
            en: "Saving...",
            zu: "Kugcinwa...",
            tn: "Go boloka...",
            af: "Stoor..."
        },
        updateAddress: {
            en: "Update Address",
            zu: "Buyekeza Ikheli",
            tn: "Ntsha Aterese",
            af: "Opdateer Adres"
        },
        saveAddress: {
            en: "Save Address",
            zu: "Gcina Ikheli",
            tn: "Boloka Aterese",
            af: "Stoor Adres"
        }
    } as const;

    // Type-safe translation getter
    const getTranslation = (key: keyof typeof translations) => {
        return translations[key][currentLanguage as SupportedLanguage];
    };

    // Query user data from Convex
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Mutation to update work address
    const updateWorkAddress = useMutation(api.functions.users.UserManagement.updateWorkAddress.updateWorkAddress);
    

    // Initialize with existing work address if available
    useEffect(() => {
        if (convexUser && convexUser.workAddress) {
            setAddress(convexUser.workAddress.address);
            setNickname(convexUser.workAddress.nickname || 'Work');
            setCoordinates(convexUser.workAddress.coordinates);
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
                    getTranslation('permissionDenied'),
                    getTranslation('locationPermissionRequired'),
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
                getTranslation('error'),
                getTranslation('failedToGetLocation'),
                { duration: 4000 }
            );
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            showGlobalError(
                getTranslation('error'),
                getTranslation('userNotLoaded'),
                { duration: 4000 }
            );
            return;
        }
        if (!address.trim()) {
            showGlobalError(
                getTranslation('error'),
                getTranslation('addressRequired'),
                { duration: 4000 }
            );
            return;
        }
        if (!nickname.trim()) {
            showGlobalError(
                getTranslation('error'),
                getTranslation('nicknameRequired'),
                { duration: 4000 }
            );
            return;
        }
        if (coordinates.latitude === 0 && coordinates.longitude === 0) {
            showGlobalError(
                getTranslation('error'),
                getTranslation('coordinatesRequired'),
                { duration: 4000 }
            );
            return;
        }
        setIsLoading(true);
        try {
            await updateWorkAddress({
                userId: user.id as Id<'taxiTap_users'>,
                workAddress: {
                    address: address.trim(),
                    nickname: nickname.trim(),
                    coordinates,
                },
            });
            showGlobalSuccess(
                getTranslation('success'),
                getTranslation('workAddressSaved'),
                { duration: 2000 }
            );
            setTimeout(() => {
                router.push('/(tabs)/PassengerProfile');
            }, 2000);
        } catch (error: any) {
            console.error('Save error:', error);
            showGlobalError(
                getTranslation('error'),
                error.message || getTranslation('failedToSaveAddress'),
                { duration: 4000 }
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            showGlobalError(
                getTranslation('error'),
                getTranslation('userNotLoaded'),
                { duration: 4000 }
            );
            return;
        }
        
        showConfirm(
            getTranslation('deleteWorkAddress'),
            getTranslation('deleteAddressConfirm'),
            async () => {
                try {
                    setIsLoading(true);
                    await updateWorkAddress({
                        userId: user.id as Id<'taxiTap_users'>,
                        workAddress: null,
                    });
                    showGlobalSuccess(
                        getTranslation('success'),
                        getTranslation('workAddressDeleted'),
                        { duration: 2000 }
                    );
                    setTimeout(() => {
                        router.push('/(tabs)/PassengerProfile');
                    }, 2000);
                } catch (error: any) {
                    console.error('Delete error:', error);
                    showGlobalError(
                        getTranslation('error'),
                        error.message || getTranslation('failedToDeleteAddress'),
                        { duration: 4000 }
                    );
                } finally {
                    setIsLoading(false);
                }
            },
            undefined,
            getTranslation('delete'),
            getTranslation('cancel')
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
            marginBottom: 24,
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
            fontSize: 22,
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
                    <LoadingSpinner size="large" />
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
                        {hasExistingAddress ? getTranslation('editWorkAddress') : getTranslation('addWorkAddress')}
                    </Text>
                </View>

                {/* Address Information Section */}
                <Text style={dynamicStyles.sectionHeader}>{getTranslation('addressInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('addressNickname')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="e.g., Work, Office, Company"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={[dynamicStyles.fieldContainer, dynamicStyles.lastField]}>
                        <Text style={dynamicStyles.label}>{getTranslation('fullAddress')}</Text>
                        <TextInput
                            style={[dynamicStyles.input, dynamicStyles.addressInput]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Enter your work address"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                </View>

                {/* Location Section */}
                <Text style={dynamicStyles.sectionHeader}>{getTranslation('location')}</Text>
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
                            {isLoadingLocation ? getTranslation('gettingLocation') : getTranslation('useCurrentLocation')}
                        </Text>
                        <Ionicons 
                            name="chevron-forward" 
                            size={16} 
                            color={isDark ? theme.border : '#C7C7CC'} 
                        />
                    </Pressable>
                </View>

                {/* Action Buttons Section */}
                <Text style={dynamicStyles.sectionHeader}>{getTranslation('actions')}</Text>
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
                                {isLoading ? getTranslation('saving') : hasExistingAddress ? getTranslation('updateAddress') : getTranslation('saveAddress')}
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
                                <Text style={dynamicStyles.deleteButtonText}>{getTranslation('delete')}</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}