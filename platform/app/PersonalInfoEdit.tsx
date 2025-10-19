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
    const { t, currentLanguage } = useLanguage();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();
    
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
            showGlobalError('Error', 'Failed to upload image', {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
        }
    };

    const handleSave = async () => {
        if (!user) {
            showGlobalError('Error', 'User not loaded', {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!name.trim()) {
            showGlobalError('Error', 'Name is required', {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
            });
            return;
        }
        if (!phoneNumber.trim()) {
            showGlobalError('Error', 'Phone number is required', {
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
            showGlobalSuccess(
              currentLanguage === 'zu' ? 'Impumelelo' :
              currentLanguage === 'tn' ? 'Katlego' :
              currentLanguage === 'af' ? 'Sukses' :
              'Success',
              currentLanguage === 'zu' ? 'Izinguquko zigciniwe ngempumelelo' :
              currentLanguage === 'tn' ? 'Diphetogo di bolokilwe ka katlego' :
              currentLanguage === 'af' ? 'Veranderinge suksesvol gestoor' :
              'Changes saved successfully',
              {
              duration: 4000,
              position: 'top',
              animation: 'slide-down',
              actions: [
                {
                  label: currentLanguage === 'zu' ? 'KULUNGILE' :
                        currentLanguage === 'tn' ? 'GO SIAME' :
                        currentLanguage === 'af' ? 'OK' :
                        'OK',
                  onPress: () => router.back(),
                  style: 'default',
                },
              ],
            });
        } catch (error: any) {
            console.error('Update error:', error);
            showGlobalError('Error', error.message || 'Failed to save changes', {
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
                    <Text style={dynamicStyles.headerTitle}>Ulwazi Lwakho</Text>
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
                <Text style={dynamicStyles.sectionTitle}>{t('personalInfo:basicInformation')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:name')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('personalInfo:namePlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:phoneNumber')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder={t('personalInfo:phoneNumberPlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:email')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('personalInfo:emailPlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Emergency Contact */}
                <Text style={dynamicStyles.sectionTitle}>{t('personalInfo:emergencyContactText')}</Text>
                <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:emergencyContactName')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            placeholder={t('personalInfo:emergencyContactNamePlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:emergencyContactPhone')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactPhone}
                            onChangeText={setEmergencyContactPhone}
                            placeholder={t('personalInfo:emergencyContactPhonePlaceholder')}
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>{t('personalInfo:emergencyContactRelationship')}</Text>
                        <TextInput
                            style={dynamicStyles.input}
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            placeholder={t('personalInfo:emergencyContactRelationshipPlaceholder')}
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
                        {isLoading ? t('personalInfo:saving') : t('personalInfo:saveChanges')}
                    </Text>
                </Pressable>
                </ScrollView>
            </View>
        </View>
    );
}