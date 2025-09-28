import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export default function PersonalInfoEdit() {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
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
        error: {
            en: "Error",
            zu: "Iphutha",
            tn: "Phoso",
            af: "Fout"
        },
        failedToUploadImage: {
            en: "Failed to upload image",
            zu: "Kuhlulekile ukulayisha isithombe",
            tn: "Go hlolekile go tsaya seswantšho",
            af: "Kon prent nie oplaai nie"
        },
        userNotLoaded: {
            en: "User not loaded",
            zu: "Umsebenzisi akakalungi",
            tn: "Mosebedisi ga a na",
            af: "Gebruiker nie gelaai nie"
        },
        nameRequired: {
            en: "Name is required",
            zu: "Igama liyadingeka",
            tn: "Leina le tlhoka",
            af: "Naam word benodig"
        },
        phoneNumberRequired: {
            en: "Phone number is required",
            zu: "Inombolo yocingo iyadingeka",
            tn: "Nomoro ya mogala e tlhoka",
            af: "Telefoon nommer word benodig"
        },
        success: {
            en: "Success",
            zu: "Impumelelo",
            tn: "Katlego",
            af: "Sukses"
        },
        changesSavedSuccessfully: {
            en: "Changes saved successfully",
            zu: "Izinguquko zigcinwe ngempumelelo",
            tn: "Diphetogo di bolokilwe ka katlego",
            af: "Veranderinge suksesvol gestoor"
        },
        ok: {
            en: "OK",
            zu: "KULUNGILE",
            tn: "GO SIAME",
            af: "OK"
        },
        failedToSaveChanges: {
            en: "Failed to save changes",
            zu: "Kuhlulekile ukugcina izinguquko",
            tn: "Go hlolekile go boloka diphetogo",
            af: "Kon veranderinge nie stoor nie"
        },
        personalInformation: {
            en: "Personal Information",
            zu: "Ulwazi Lwomuntu",
            tn: "Tshedimosetso ya Motho",
            af: "Persoonlike Inligting"
        },
        basicInformation: {
            en: "Basic Information",
            zu: "Ulwazi Oluyisisekelo",
            tn: "Tshedimosetso ya Motheo",
            af: "Basiese Inligting"
        },
        name: {
            en: "Name",
            zu: "Igama",
            tn: "Leina",
            af: "Naam"
        },
        namePlaceholder: {
            en: "Enter your full name",
            zu: "Faka igama lakho eligcwele",
            tn: "Kenya leina la gago le le tletseng",
            af: "Voer jou volledige naam in"
        },
        phoneNumber: {
            en: "Phone Number",
            zu: "Inombolo Yocingo",
            tn: "Nomoro ya Mogala",
            af: "Telefoon Nommer"
        },
        phoneNumberPlaceholder: {
            en: "Enter your phone number",
            zu: "Faka inombolo yakho yocingo",
            tn: "Kenya nomoro ya gago ya mogala",
            af: "Voer jou telefoon nommer in"
        },
        email: {
            en: "Email",
            zu: "I-imeyili",
            tn: "Imeile",
            af: "E-pos"
        },
        emailPlaceholder: {
            en: "Enter your email address",
            zu: "Faka ikheli lakho le-imeyili",
            tn: "Kenya aterese ya gago ya imeile",
            af: "Voer jou e-pos adres in"
        },
        emergencyContactText: {
            en: "Emergency Contact",
            zu: "Othintana Ngezimo Eziphuthumayo",
            tn: "Mogokanyi wa Tshoganetso",
            af: "Nood Kontak"
        },
        emergencyContactName: {
            en: "Emergency Contact Name",
            zu: "Igama Lomuntu Othintana Ngezimo Eziphuthumayo",
            tn: "Leina la Mogokanyi wa Tshoganetso",
            af: "Nood Kontak Naam"
        },
        emergencyContactNamePlaceholder: {
            en: "Enter emergency contact name",
            zu: "Faka igama lomuntu othintana ngezimo eziphuthumayo",
            tn: "Kenya leina la mogokanyi wa tshoganetso",
            af: "Voer nood kontak naam in"
        },
        emergencyContactPhone: {
            en: "Emergency Contact Phone",
            zu: "Ucingo Lomuntu Othintana Ngezimo Eziphuthumayo",
            tn: "Mogala wa Mogokanyi wa Tshoganetso",
            af: "Nood Kontak Telefoon"
        },
        emergencyContactPhonePlaceholder: {
            en: "Enter emergency contact phone",
            zu: "Faka ucingo lomuntu othintana ngezimo eziphuthumayo",
            tn: "Kenya mogala wa mogokanyi wa tshoganetso",
            af: "Voer nood kontak telefoon in"
        },
        emergencyContactRelationship: {
            en: "Relationship",
            zu: "Ubudlelwano",
            tn: "Kamano",
            af: "Verhouding"
        },
        emergencyContactRelationshipPlaceholder: {
            en: "e.g., Parent, Spouse, Friend",
            zu: "isb., Umzali, Umngane, Umngane",
            tn: "mohlala, Motsadi, Motsadi, Tsala",
            af: "bv., Ouer, Gade, Vriend"
        },
        saving: {
            en: "Saving...",
            zu: "Kugcinwa...",
            tn: "Go boloka...",
            af: "Stoor..."
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

    // Query user data from Convex
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Mutation to update user profile
    const updateUserProfile = useMutation(api.functions.users.UserManagement.updateUserProfile.updateUserProfile);

    // Initialize form data
    useEffect(() => {
        if (convexUser) {
            setName(convexUser.name || '');
            setPhoneNumber(convexUser.phoneNumber || '');
            setEmail(convexUser.email || '');
            if (convexUser.emergencyContact) {
                setEmergencyContactName(convexUser.emergencyContact.name || '');
                setEmergencyContactPhone(convexUser.emergencyContact.phoneNumber || '');
                setEmergencyContactRelationship(convexUser.emergencyContact.relationship || '');
            }
            if (convexUser.profilePicture) {
                setImageUri(convexUser.profilePicture);
            }
        } else if (user) {
            setName(user.name || '');
            setPhoneNumber(user.phoneNumber || '');
            // Do not set email, emergencyContact, or profilePicture from context user
        }
    }, [convexUser, user]);

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
            showGlobalError(getTranslation('error'), getTranslation('failedToUploadImage'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
        }
    };

    const handleSave = async () => {
        if (!user) {
            showGlobalError(getTranslation('error'), getTranslation('userNotLoaded'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!name.trim()) {
            showGlobalError(getTranslation('error'), getTranslation('nameRequired'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!phoneNumber.trim()) {
            showGlobalError(getTranslation('error'), getTranslation('phoneNumberRequired'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        
        setIsLoading(true);
        try {
            const updateData: any = {
                userId: user.id as Id<"taxiTap_users">,
                name: name.trim(),
                phoneNumber: phoneNumber.trim(),
                profilePicture: imageUri || undefined,
                emergencyContact: emergencyContactName.trim() ? {
                    name: emergencyContactName.trim(),
                    phoneNumber: emergencyContactPhone.trim(),
                    relationship: emergencyContactRelationship.trim(),
                } : undefined,
            };
            if (email.trim()) {
                updateData.email = email.trim();
            }
            await updateUserProfile(updateData);
            // Update context
            if (name !== user.name) {
                await updateUserName(name);
            }
            if (phoneNumber !== user.phoneNumber) {
                await updateNumber(phoneNumber);
            }
            showGlobalSuccess(getTranslation('success'), getTranslation('changesSavedSuccessfully'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
              actions: [
                {
                  label: getTranslation('ok'),
                  onPress: () => router.back(),
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
            <ScrollView contentContainerStyle={dynamicStyles.container}>
                {/* Header */}
                <View style={dynamicStyles.header}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.push('../PassengerProfile')}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>{getTranslation('personalInformation')}</Text>
                </View>

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
                        <Text style={dynamicStyles.label}>{getTranslation('name')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={getTranslation('namePlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('phoneNumber')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder={getTranslation('phoneNumberPlaceholder')}
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
                            placeholder={getTranslation('emailPlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Emergency Contact */}
                <Text style={dynamicStyles.sectionTitle}>{getTranslation('emergencyContactText')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('emergencyContactName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            placeholder={getTranslation('emergencyContactNamePlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{getTranslation('emergencyContactPhone')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactPhone}
                            onChangeText={setEmergencyContactPhone}
                            placeholder={getTranslation('emergencyContactPhonePlaceholder')}
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
                            placeholder={getTranslation('emergencyContactRelationshipPlaceholder')}
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