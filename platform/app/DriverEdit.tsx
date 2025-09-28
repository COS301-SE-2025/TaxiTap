import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as ImagePicker from 'expo-image-picker';
import { useAlertHelpers } from '../components/AlertHelpers';

export default function DriverPersonalInfoEdit() {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [email, setEmail] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const { user, updateUserName, updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();
    
    // Supported languages type
    type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

    // Hardcoded translations for all UI text
    const translations: Record<string, Record<SupportedLanguage, string>> = {
        driverPersonalInfo: {
            en: "Driver Personal Info",
            zu: "Ulwazi Lwakho Lomshayeli",
            tn: "Tshedimosetso ya Mokgweetsi",
            af: "Bestuurder Persoonlike Inligting"
        },
        editingDriverProfile: {
            en: "Editing Driver Profile",
            zu: "Kuhlelwa Iphrofayili Yomshayeli",
            tn: "Go Fetola Profaele ya Mokgweetsi",
            af: "Besig om Bestuurder Profiel te Wysig"
        },
        basicInformation: {
            en: "Basic Information",
            zu: "Ulwazi Oluyisisekelo",
            tn: "Tshedimosetso ya Motheo",
            af: "Basiese Inligting"
        },
        fullName: {
            en: "Full Name",
            zu: "Igama Eligcwele",
            tn: "Leina le le Tletseng",
            af: "Volle Naam"
        },
        enterFullName: {
            en: "Enter your full name",
            zu: "Faka igama lakho eligcwele",
            tn: "Kenya leina la gago le le tletseng",
            af: "Voer jou volle naam in"
        },
        phoneNumber: {
            en: "Phone Number",
            zu: "Inombolo Yefoni",
            tn: "Nomoro ya Mogala",
            af: "Telefoon Nommer"
        },
        enterPhoneNumber: {
            en: "Enter your phone number",
            zu: "Faka inombolo yakho yefoni",
            tn: "Kenya nomoro ya gago ya mogala",
            af: "Voer jou telefoon nommer in"
        },
        email: {
            en: "Email",
            zu: "I-imeyili",
            tn: "Imeile",
            af: "E-pos"
        },
        enterEmail: {
            en: "Enter your email",
            zu: "Faka i-imeyili yakho",
            tn: "Kenya imeile ya gago",
            af: "Voer jou e-pos in"
        },
        emergencyContact: {
            en: "Emergency Contact",
            zu: "Uxhumano Lwesimo Esiphuthumayo",
            tn: "Mogokanyi wa Tshoganetso",
            af: "Nood Kontak"
        },
        emergencyContactName: {
            en: "Emergency Contact Name",
            zu: "Igama Lomuntu Oxhumana Naye Esimweni Esiphuthumayo",
            tn: "Leina la Mogokanyi wa Tshoganetso",
            af: "Nood Kontak Naam"
        },
        enterEmergencyContactName: {
            en: "Enter emergency contact name",
            zu: "Faka igama lomuntu oxhumana naye esimweni esiphuthumayo",
            tn: "Kenya leina la mogokanyi wa tshoganetso",
            af: "Voer nood kontak naam in"
        },
        emergencyContactPhone: {
            en: "Emergency Contact Phone",
            zu: "Inombolo Yefoni Yomuntu Oxhumana Naye Esimweni Esiphuthumayo",
            tn: "Nomoro ya Mogala ya Mogokanyi wa Tshoganetso",
            af: "Nood Kontak Telefoon"
        },
        enterEmergencyContactNumber: {
            en: "Enter emergency contact number",
            zu: "Faka inombolo yefoni yomuntu oxhumana naye esimweni esiphuthumayo",
            tn: "Kenya nomoro ya mogala ya mogokanyi wa tshoganetso",
            af: "Voer nood kontak telefoon in"
        },
        emergencyContactRelationship: {
            en: "Relationship",
            zu: "Ubuhlobo",
            tn: "Kamano",
            af: "Verhouding"
        },
        relationshipPlaceholder: {
            en: "e.g., Spouse, Parent, Friend",
            zu: "isb., Umngane Wokuganana, Umzali, Umngane",
            tn: "mohlala, Motsadi, Motsadi, Tsala",
            af: "bv., Gade, Ouer, Vriend"
        },
        changePhoto: {
            en: "Change Photo",
            zu: "Shintsha Isithombe",
            tn: "Fetola Seswantšho",
            af: "Verander Foto"
        },
        saveChanges: {
            en: "Save Changes",
            zu: "Londoloza Izinguquko",
            tn: "Boloka Diphetogo",
            af: "Stoor Veranderinge"
        },
        cancel: {
            en: "Cancel",
            zu: "Khansela",
            tn: "Tlhokomolola",
            af: "Kanselleer"
        },
        loading: {
            en: "Loading...",
            zu: "Kulayishwa...",
            tn: "Go tsena...",
            af: "Laai..."
        },
        error: {
            en: "Error",
            zu: "Iphutha",
            tn: "Phoso",
            af: "Fout"
        },
        userNotFound: {
            en: "User not found",
            zu: "Umsebenzisi akatholakali",
            tn: "Mosebedisi ga a bonwe",
            af: "Gebruiker nie gevind nie"
        },
        nameRequired: {
            en: "Name is required",
            zu: "Igama liyadingeka",
            tn: "Leina le tlhoka",
            af: "Naam word benodig"
        },
        phoneNumberRequired: {
            en: "Phone number is required",
            zu: "Inombolo yefoni iyadingeka",
            tn: "Nomoro ya mogala e tlhoka",
            af: "Telefoon nommer word benodig"
        },
        changesSaved: {
            en: "Changes saved successfully!",
            zu: "Izinguquko zilondoloziwe ngempumelelo!",
            tn: "Diphetogo di bolokilwe ka katlego!",
            af: "Veranderinge suksesvol gestoor!"
        },
        failedToSaveChanges: {
            en: "Failed to save changes",
            zu: "Kuhlulekile ukulondoloza izinguquko",
            tn: "Go hlolekile go boloka diphetogo",
            af: "Kon veranderinge nie stoor nie"
        },
        ok: {
            en: "OK",
            zu: "KULUNGILE",
            tn: "GO SIAME",
            af: "OK"
        },
        saving: {
            en: "Saving...",
            zu: "Kugcinwa...",
            tn: "Go boloka...",
            af: "Stoor..."
        }
    } as const;

    // Type-safe translation getter
    const getTranslation = (key: keyof typeof translations) => {
        return translations[key][currentLanguage as SupportedLanguage];
    };

    // Initialize form data from user context
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setNumber(user.phoneNumber || '');
            // Note: email is not available in UserContext, will be fetched from convex
        }
    }, [user]);

    // Query user data from Convex
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Initialize data from convex
    useEffect(() => {
        if (convexUser) {
            setEmail(convexUser.email || '');
            // Note: licenseNumber and yearsExperience are not in the current schema
            // These would need to be added to the schema if required
            if (convexUser.emergencyContact) {
                setEmergencyContactName(convexUser.emergencyContact.name || '');
                setEmergencyContactNumber(convexUser.emergencyContact.phoneNumber || '');
                setEmergencyContactRelationship(convexUser.emergencyContact.relationship || '');
            }
            if (convexUser.profilePicture) {
                setImageUri(convexUser.profilePicture);
            }
        }
    }, [convexUser]);

    // Mutation for updating user profile
    const updateUserProfile = useMutation(api.functions.users.UserManagement.updateUserProfile.updateUserProfile);

    const handleUploadPhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setImageUri(uri);
            }
        } catch (error) {
            console.error('Image upload error:', error);
            showGlobalError(getTranslation('error'), 'Failed to upload image', {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        }
    };

    const handleSave = async () => {
        if (!user?.id) {
            showGlobalError(getTranslation('error'), getTranslation('userNotFound'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        // Validation
        if (!name.trim()) {
            showGlobalError(getTranslation('error'), getTranslation('nameRequired'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        if (!number.trim()) {
            showGlobalError(getTranslation('error'), getTranslation('phoneNumberRequired'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        setIsLoading(true);
        try {
            // Update basic info in context
            if (name !== user.name) {
                await updateUserName(name);
            }

            if (number !== user.phoneNumber) {
                await updateNumber(number);
            }

            // Prepare emergency contact object
            const emergencyContact = emergencyContactName && emergencyContactNumber && emergencyContactRelationship ? {
                name: emergencyContactName,
                phoneNumber: emergencyContactNumber,
                relationship: emergencyContactRelationship
            } : undefined;

            // Update user profile in database
            await updateUserProfile({ 
                userId: user.id as Id<"taxiTap_users">, 
                name, 
                phoneNumber: number,
                email,
                profilePicture: imageUri || undefined,
                emergencyContact
            });

            showGlobalSuccess('Success', getTranslation('changesSaved'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
                actions: [
                    {
                        label: getTranslation('ok'),
                        onPress: () => router.push('../DriverProfile'),
                        style: 'default',
                    },
                ],
            });

        } catch (error: any) {
            console.error('Update error:', error);
            showGlobalError(getTranslation('error'), error.message || getTranslation('failedToSaveChanges'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('../DriverProfile');
    };

    const dynamicStyles = StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
            borderTopWidth: 0,
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
            marginRight: 15,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.text,
        },
        photoSection: {
            alignItems: 'center',
            marginBottom: 24,
        },
        photoContainer: {
            position: 'relative',
        },
        profileImageBackground: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        editPhotoButton: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: theme.primary,
            borderRadius: 15,
            width: 30,
            height: 30,
            justifyContent: 'center',
            alignItems: 'center',
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            overflow: 'hidden',
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 8,
            paddingHorizontal: 4,
        },
        fieldContainer: {
            marginBottom: 16,
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
        saveButton: {
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginTop: 16,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
        },
        separator: {
            height: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            marginVertical: 16,
        },
    });

    if (!user) {
        return <LoadingSpinner />;
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView contentContainerStyle={dynamicStyles.container}>
                {/* Profile Photo Section */}
                <View style={dynamicStyles.photoSection}>
                    <View style={dynamicStyles.photoContainer}>
                        <Pressable onPress={handleUploadPhoto}>
                            {imageUri ? (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={{ width: 100, height: 100, borderRadius: 50 }}
                                />
                            ) : (
                                <View style={dynamicStyles.profileImageBackground}>
                                    <Ionicons name="person" size={48} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
                                </View>
                            )}
                        </Pressable>
                        <Pressable style={dynamicStyles.editPhotoButton} onPress={handleUploadPhoto}>
                            <Ionicons name="camera" size={16} color={isDark ? '#121212' : '#fff'} />
                        </Pressable>
                    </View>
                </View>

                {/* Basic Information */}
                <Text style={dynamicStyles.sectionTitle}>{getTranslation('basicInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('fullName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={getTranslation('enterFullName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('phoneNumber')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={number}
                            onChangeText={setNumber}
                            placeholder={getTranslation('enterPhoneNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('email')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={getTranslation('enterEmail')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Emergency Contact Section */}
                <Text style={dynamicStyles.sectionTitle}>{getTranslation('emergencyContact')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('emergencyContactName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            placeholder={getTranslation('enterEmergencyContactName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('emergencyContactPhone')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactNumber}
                            onChangeText={setEmergencyContactNumber}
                            placeholder={getTranslation('enterEmergencyContactNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('emergencyContactRelationship')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            placeholder={getTranslation('relationshipPlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>
                </View>

                {/* Save Button */}
                <Pressable
                    style={[dynamicStyles.saveButton, isLoading && dynamicStyles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text style={dynamicStyles.saveButtonText}>
                        {isLoading ? getTranslation('saving') : getTranslation('saveChanges')}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}