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
    
    // Use centralized translations
    const { t } = useLanguage();

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
            showGlobalError(t('common.error'), t('personalInfo.failedToUploadImage'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
        }
    };

    const handleSave = async () => {
        if (!user?.id) {
            showGlobalError(t('common.error'), t('personalInfo.userNotLoaded'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        // Validation
        if (!name.trim()) {
            showGlobalError(t('common.error'), t('personalInfo.nameRequired'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
            });
            return;
        }

        if (!number.trim()) {
            showGlobalError(t('common.error'), t('personalInfo.phoneNumberRequired'), {
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

            showGlobalSuccess(t('common.success'), t('personalInfo.changesSavedSuccessfully'), {
                duration: 4000,
                position: 'top',
                animation: 'slide-down',
                actions: [
                    {
                        label: t('common.ok'),
                        onPress: () => router.push('../DriverProfile'),
                        style: 'default',
                    },
                ],
            });

        } catch (error: any) {
            console.error('Update error:', error);
            showGlobalError(t('common.error'), error.message || t('personalInfo.failedToSaveChanges'), {
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
                <Text style={dynamicStyles.sectionTitle}>{t('personalInfo.basicInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.fullName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('personalInfo.enterFullName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.phoneNumber')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={number}
                            onChangeText={setNumber}
                            placeholder={t('personalInfo.enterPhoneNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.email')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('personalInfo.enterEmail')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Emergency Contact Section */}
                <Text style={dynamicStyles.sectionTitle}>{t('personalInfo.emergencyContact')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.emergencyContactName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            placeholder={t('personalInfo.enterEmergencyContactName')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.emergencyContactPhone')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactNumber}
                            onChangeText={setEmergencyContactNumber}
                            placeholder={t('personalInfo.enterEmergencyContactNumber')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo.emergencyContactRelationship')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            placeholder={t('personalInfo.relationshipPlaceholder')}
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
                        {isLoading ? t('personalInfo.saving') : t('personalInfo.saveChanges')}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}