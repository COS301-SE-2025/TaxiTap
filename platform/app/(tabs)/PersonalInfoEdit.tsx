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
    const { t } = useLanguage();
    const { showGlobalError, showGlobalSuccess } = useAlertHelpers();

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
            showGlobalSuccess('Success', 'Changes saved successfully', {
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
        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },
        container: {
            backgroundColor: theme.background,
            padding: 20,
            paddingBottom: 40,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 30,
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
            marginBottom: 30,
        },
        photoContainer: {
            position: 'relative',
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
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 15,
        },
        fieldContainer: {
            marginBottom: 15,
        },
        label: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 5,
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
        saveButton: {
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 20,
        },
        saveButtonDisabled: {
            opacity: 0.6,
        },
        saveButtonText: {
            color: isDark ? '#121212' : '#fff',
            fontWeight: 'bold',
            fontSize: 18,
        },
    });

    if (!user) {
        return (
            <SafeAreaView style={dynamicStyles.safeArea}>
                <View style={dynamicStyles.container}>
                    <Text style={{ color: theme.text }}>{t('personalInfo:loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView contentContainerStyle={dynamicStyles.container}>
                {/* Header */}
                <View style={dynamicStyles.header}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>{t('personalInfo:personalInformation')}</Text>
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
                                <Ionicons name="person-circle" size={100} color={theme.text} />
                            )}
                        </Pressable>
                        <Pressable style={dynamicStyles.editPhotoButton} onPress={handleUploadPhoto}>
                            <Ionicons name="camera" size={16} color={isDark ? '#121212' : '#fff'} />
                        </Pressable>
                    </View>
                </View>

                {/* Basic Information */}
                <View style={dynamicStyles.section}>
                    <Text style={dynamicStyles.sectionTitle}>{t('personalInfo:personalInformation')}</Text>
                    
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
                <View style={dynamicStyles.section}>
                    <Text style={dynamicStyles.sectionTitle}>{t('personalInfo:emergencyContact')}</Text>
                    
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
        </SafeAreaView>
    );
}