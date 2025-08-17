import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
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
    const router = useRouter();
    const { user, updateUserName, updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const [imageUri, setImageUri] = useState<string | null>(null);
    
    // Hardcoded translations
    const translations = {
        en: {
            driverPersonalInfo: "Driver Personal Info",
            editingDriverProfile: "Editing Driver Profile",
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
            loading: "Loading...",
            error: "Error",
            userNotFound: "User not found",
            nameRequired: "Name is required",
            phoneNumberRequired: "Phone number is required",
            changesSaved: "Changes saved successfully!",
            failedToSaveChanges: "Failed to save changes",
            ok: "OK"
        },
        zu: {
            driverPersonalInfo: "Ulwazi Lwakho Lomshayeli",
            editingDriverProfile: "Kuhlelwa Iphrofayili Yomshayeli",
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
            loading: "Kulayishwa...",
            error: "Iphutha",
            userNotFound: "Umsebenzisi akalayishwanga",
            nameRequired: "Igama liyadingeka",
            phoneNumberRequired: "Inombolo yefoni iyadingeka",
            changesSaved: "Izinguquko zilondoloziwe ngempumelelo!",
            failedToSaveChanges: "Kuhlulekile ukulondoloza izinguquko",
            ok: "Kulungile"
        }
    };
    
    const t = (key: string) => {
        const lang = currentLanguage === 'zu' ? 'zu' : 'en';
        return translations[lang][key as keyof typeof translations[typeof lang]] || key;
    };
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();

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
        }
    }, [convexUser]);

    // Mutation for updating user profile
    const updateUserProfile = useMutation(api.functions.users.UserManagement.updateUserProfile.updateUserProfile);

    const handleUploadPhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 1,
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

    const handleSave = async () => {
        try {
            if (!user?.id) {
                Alert.alert(t('error'), t('userNotFound'));
                showGlobalError('Error', 'User not found', {
                    duration: 3000,
                    position: 'top',
                    animation: 'slide-down',
                });
                return;
            }

            // Validation
            if (!name.trim()) {
                showGlobalError('Error', 'Name is required', {
                    duration: 3000,
                    position: 'top',
                    animation: 'slide-down',
                });
                Alert.alert(t('error'), t('nameRequired'));
                return;
            }

            if (!number.trim()) {
                Alert.alert(t('error'), t('phoneNumberRequired'));
                showGlobalError('Error', 'Phone number is required', {
                    duration: 3000,
                    position: 'top',
                    animation: 'slide-down',
                });
                return;
            }

            // Note: License number and years experience validation removed as they're not in schema
            // These would need to be added to the schema if required

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
                emergencyContact
            });

            showGlobalSuccess(t('success'), t('changesSaved'), {
                duration: 0,
                position: 'top',
                animation: 'slide-down',
                actions: [
                    {
                        label: t('ok'),
                        onPress: () => router.push('../DriverProfile'),
                        style: 'default',
                    },
                ],
            });

        } catch (error: any) {
            Alert.alert(t('error'), error.message || t('failedToSaveChanges'));
            showGlobalError('Error', error.message || 'Failed to update driver profile', {
                duration: 5000,
                position: 'top',
                animation: 'slide-down',
            });
        }
    };

    const handleCancel = () => {
        router.push('../DriverProfile');
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
        headerSection: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 30,
        },
        backButton: {
            marginRight: 15,
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text,
        },
        profileImageSection: {
            alignItems: 'center',
            marginBottom: 30,
        },
        profileImageContainer: {
            marginBottom: 15,
        },
        changePhotoText: {
            fontSize: 16,
            color: theme.primary,
            fontWeight: '600',
        },
        formSection: {
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
            fontWeight: '600',
            color: theme.text,
            marginBottom: 15,
        },
        fieldContainer: {
            marginBottom: 20,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 8,
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
        buttonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
        },
        cancelButton: {
            backgroundColor: isDark ? theme.surface : '#f0f0f0',
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 8,
            flex: 1,
            marginRight: 10,
            alignItems: 'center',
        },
        cancelButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
        },
        saveButton: {
            backgroundColor: theme.primary,
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 8,
            flex: 1,
            marginLeft: 10,
            alignItems: 'center',
        },
        saveButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#121212' : '#fff',
        },
        roleIndicator: {
            fontSize: 14,
            color: theme.text,
            opacity: 0.7,
            textAlign: 'center',
            marginBottom: 20,
        },

    });

    if (!user) {
        return (
            <SafeAreaView style={dynamicStyles.safeArea}>
                <View style={dynamicStyles.container}>
                    <Text>{t('loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView contentContainerStyle={dynamicStyles.container}>
                {/* Header */}
                <View style={dynamicStyles.headerSection}>
                    <Pressable onPress={handleCancel} style={dynamicStyles.backButton}>
                        <Ionicons name="chevron-back" size={24} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>{t('driverPersonalInfo')}</Text>
                </View>

                {/* Role Indicator */}
                <Text style={dynamicStyles.roleIndicator}>
                    {t('editingDriverProfile')}
                </Text>

                {/* Profile Image Section */}
                <View style={dynamicStyles.profileImageSection}>
                    <Pressable onPress={handleUploadPhoto} style={dynamicStyles.profileImageContainer}>
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                resizeMode="cover"
                                style={{ width: 100, height: 100, borderRadius: 50 }}
                            />
                        ) : (
                            <Ionicons name="person-circle" size={100} color={theme.text} />
                        )}
                    </Pressable>
                    <Pressable onPress={handleUploadPhoto}>
                        <Text style={dynamicStyles.changePhotoText}>{t('changePhoto')}</Text>
                    </Pressable>
                </View>

                {/* Basic Information Section */}
                <View style={dynamicStyles.formSection}>
                    <Text style={dynamicStyles.sectionTitle}>{t('basicInformation')}</Text>
                    
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('fullName')}</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={dynamicStyles.input}
                            placeholder={t('enterFullName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('phoneNumber')}</Text>
                        <TextInput
                            value={number}
                            onChangeText={setNumber}
                            style={dynamicStyles.input}
                            placeholder={t('enterPhoneNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('email')}</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={dynamicStyles.input}
                            placeholder={t('enterEmail')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Note: Driver-specific fields removed as they're not in the current schema */}
                {/* These would need to be added to the schema if required */}

                {/* Emergency Contact Section */}
                <View style={dynamicStyles.formSection}>
                    <Text style={dynamicStyles.sectionTitle}>{t('emergencyContact')}</Text>
                    
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactName')}</Text>
                        <TextInput
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            style={dynamicStyles.input}
                            placeholder={t('enterEmergencyContactName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactPhone')}</Text>
                        <TextInput
                            value={emergencyContactNumber}
                            onChangeText={setEmergencyContactNumber}
                            style={dynamicStyles.input}
                            placeholder={t('enterEmergencyContactNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('emergencyContactRelationship')}</Text>
                        <TextInput
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            style={dynamicStyles.input}
                            placeholder={t('relationshipPlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={dynamicStyles.buttonContainer}>
                    <Pressable style={dynamicStyles.cancelButton} onPress={handleCancel}>
                        <Text style={dynamicStyles.cancelButtonText}>{t('cancel')}</Text>
                    </Pressable>
                    <Pressable style={dynamicStyles.saveButton} onPress={handleSave}>
                        <Text style={dynamicStyles.saveButtonText}>{t('saveChanges')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}