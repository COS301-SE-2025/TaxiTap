import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image, Platform, Dimensions } from 'react-native';
import { useAlertHelpers } from '../components/AlertHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
    
    // Hardcoded translations
    const translations = {
        en: {
            error: "Error",
            failedToUploadImage: "Failed to upload image",
            userNotLoaded: "User not loaded",
            nameRequired: "Name is required",
            phoneNumberRequired: "Phone number is required",
            savingChanges: "Saving changes...",
            changesSaved: "Changes saved successfully!",
            failedToSaveChanges: "Failed to save changes",
            personalInfo: "Personal Info",
            editingProfile: "Editing Profile",
            basicInformation: "Basic Information",
            fullName: "Full Name",
            enterFullName: "Enter your full name",
            phoneNumber: "Phone Number",
            enterPhoneNumber: "Enter your phone number",
            email: "Email",
            enterEmail: "Enter your email",
            emergencyContact: "Emergency Contact",
            emergencyContactName: "Emergency Contact Name",
            enterEmergencyContactName: "Enter emergency contact name",
            emergencyContactPhone: "Emergency Contact Phone",
            enterEmergencyContactNumber: "Enter emergency contact number",
            emergencyContactRelationship: "Relationship",
            relationshipPlaceholder: "e.g., Spouse, Parent, Friend",
            changePhoto: "Change Photo",
            saveChanges: "Save Changes",
            cancel: "Cancel",
            loading: "Loading..."
        },
        tn: {
            error: "Phoso",
            failedToUploadImage: "Go hlolekile go tsaya setshwantsho",
            userNotLoaded: "Mosebenzisi ga a layishwe",
            nameRequired: "Leina le tlhoka",
            phoneNumberRequired: "Nomoro ya tsela e tlhoka",
            savingChanges: "Go boloka diphetogo...",
            changesSaved: "Diphetogo di bolokilwe ka katlego!",
            failedToSaveChanges: "Go hlolekile go boloka diphetogo",
            personalInfo: "Tshedimosetso ya Botho",
            editingProfile: "Go Hlopha Profaile",
            basicInformation: "Tshedimosetso e e Tlhokomelwang",
            fullName: "Leina Le Feletseng",
            enterFullName: "Tsenya leina la gago le feletseng",
            phoneNumber: "Nomoro ya Tsela",
            enterPhoneNumber: "Tsenya nomoro ya gago ya tsela",
            email: "Imeile",
            enterEmail: "Tsenya imeile ya gago",
            emergencyContact: "Kgokagano ya Tshoganetso",
            emergencyContactName: "Leina la Kgokagano ya Tshoganetso",
            enterEmergencyContactName: "Tsenya leina la kgokagano ya tshoganetso",
            emergencyContactPhone: "Nomoro ya Tsela ya Kgokagano ya Tshoganetso",
            enterEmergencyContactNumber: "Tsenya nomoro ya tsela ya kgokagano ya tshoganetso",
            emergencyContactRelationship: "Kgokagano",
            relationshipPlaceholder: "mme., Mongwadi, Motswadi, Tsala",
            changePhoto: "Fetola Setshwantsho",
            saveChanges: "Boloka Diphetogo",
            cancel: "Khansela",
            loading: "Go Layishwa..."
        },
        zu: {
            error: "Iphutha",
            failedToUploadImage: "Kuhlulekile ukulayisha isithombe",
            userNotLoaded: "Umsebenzisi akalayishwanga",
            nameRequired: "Igama liyadingeka",
            phoneNumberRequired: "Inombolo yefoni iyadingeka",
            savingChanges: "Kulondoloza izinguquko...",
            changesSaved: "Izinguquko zilondoloziwe ngempumelelo!",
            failedToSaveChanges: "Kuhlulekile ukulondoloza izinguquko",
            personalInfo: "Ulwazi Lwakho",
            editingProfile: "Kuhlelwa Iphrofayili",
            basicInformation: "Ulwazi Oluyisisekelo",
            fullName: "Igama Eligcwele",
            enterFullName: "Faka igama lakho eligcwele",
            phoneNumber: "Inombolo Yefoni",
            enterPhoneNumber: "Faka inombolo yakho yefoni",
            email: "I-imeyili",
            enterEmail: "Faka i-imeyili yakho",
            emergencyContact: "Uxhumano Lwesimo Esiphuthumayo",
            emergencyContactName: "Igama Lomuntu Oxhumana Naye Esimweni Esiphuthumayo",
            enterEmergencyContactName: "Faka igama lomuntu oxhumana naye esimweni esiphuthumayo",
            emergencyContactPhone: "Inombolo Yefoni Yomuntu Oxhumana Naye Esimweni Esiphuthumayo",
            enterEmergencyContactNumber: "Faka inombolo yefoni yomuntu oxhumana naye esimweni esiphuthumayo",
            emergencyContactRelationship: "Ubuhlobo",
            relationshipPlaceholder: "isb., Umngane Wokuganana, Umzali, Umngane",
            changePhoto: "Shintsha Isithombe",
            saveChanges: "Londoloza Izinguquko",
            cancel: "Khansela",
            loading: "Kulayishwa..."
        },
        af: {
            error: "Fout",
            failedToUploadImage: "Kon nie beeld oplaai nie",
            userNotLoaded: "Gebruiker nie gelaai nie",
            nameRequired: "Naam word vereis",
            phoneNumberRequired: "Telefoonnommer word vereis",
            savingChanges: "Stoor veranderinge...",
            changesSaved: "Veranderinge suksesvol gestoor!",
            failedToSaveChanges: "Kon nie veranderinge stoor nie",
            personalInfo: "Persoonlike Inligting",
            editingProfile: "Redigeer Profiel",
            basicInformation: "Basiese Inligting",
            fullName: "Volle Naam",
            enterFullName: "Voer jou volle naam in",
            phoneNumber: "Telefoonnommer",
            enterPhoneNumber: "Voer jou telefoonnommer in",
            email: "E-pos",
            enterEmail: "Voer jou e-pos in",
            emergencyContact: "Noodkontak",
            emergencyContactName: "Noodkontak Naam",
            enterEmergencyContactName: "Voer noodkontak naam in",
            emergencyContactPhone: "Noodkontak Telefoonnommer",
            enterEmergencyContactNumber: "Voer noodkontak telefoonnommer in",
            emergencyContactRelationship: "Verhouding",
            relationshipPlaceholder: "bv., Gade, Ouer, Vriend",
            changePhoto: "Verander Foto",
            saveChanges: "Stoor Veranderinge",
            cancel: "Kanselleer",
            loading: "Laai..."
        }
    };
    
    const t = (key: string) => {
        const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
        return translations[lang][key as keyof typeof translations[typeof lang]] || key;
    };
    
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
            showGlobalError(t('error'), t('failedToUploadImage'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
        }
    };

    const handleSave = async () => {
        if (!user) {
            showGlobalError(t('error'), t('userNotLoaded'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!name.trim()) {
            showGlobalError(t('error'), t('nameRequired'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!phoneNumber.trim()) {
            showGlobalError(t('error'), t('phoneNumberRequired'), {
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
            showGlobalSuccess('Success', t('changesSaved'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
              actions: [
                {
                  label: 'OK',
                  onPress: () => router.back(),
                  style: 'default',
                },
              ],
            });
        } catch (error: any) {
            console.error('Update error:', error);
            showGlobalError(t('error'), error.message || t('failedToSaveChanges'), {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
        } finally {
            setIsLoading(false);
        }
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
            padding: isSmallScreen ? 16 : 20,
            marginBottom: isSmallScreen ? 12 : 16,
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
            <View style={dynamicStyles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>Personal Information</Text>
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
                <Text style={dynamicStyles.sectionTitle}>{t('basicInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('fullName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('enterFullName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('phoneNumber')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder={t('enterPhoneNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('email')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('enterEmail')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Emergency Contact */}
                <Text style={dynamicStyles.sectionTitle}>{t('emergencyContact')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            placeholder={t('enterEmergencyContactName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactPhone')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactPhone}
                            onChangeText={setEmergencyContactPhone}
                            placeholder={t('enterEmergencyContactNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactRelationship')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            placeholder={t('relationshipPlaceholder')}
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
                        {isLoading ? t('savingChanges') : t('saveChanges')}
                    </Text>
                </Pressable>
                </ScrollView>
            </View>
        </View>
    );
}