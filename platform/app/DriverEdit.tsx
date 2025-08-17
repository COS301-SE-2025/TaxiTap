import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
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
    const [imageUri, setImageUri] = useState<string | null>(null);
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
                return;
            }

            if (!number.trim()) {
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

            showGlobalSuccess('Success', 'Driver profile updated successfully!', {
                duration: 0,
                position: 'top',
                animation: 'slide-down',
                actions: [
                    {
                        label: 'OK',
                        onPress: () => router.push('../DriverProfile'),
                        style: 'default',
                    },
                ],
            });

        } catch (error: any) {
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
                    <Text>Loading user data...</Text>
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
                    <Text style={dynamicStyles.headerTitle}>Driver Personal Info</Text>
                </View>

                {/* Role Indicator */}
                <Text style={dynamicStyles.roleIndicator}>
                    Editing Driver Profile
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
                        <Text style={dynamicStyles.changePhotoText}>Change Photo</Text>
                    </Pressable>
                </View>

                {/* Basic Information Section */}
                <View style={dynamicStyles.formSection}>
                    <Text style={dynamicStyles.sectionTitle}>Basic Information</Text>
                    
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Full Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            style={dynamicStyles.input}
                            placeholder="Enter your full name"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Phone Number</Text>
                        <TextInput
                            value={number}
                            onChangeText={setNumber}
                            style={dynamicStyles.input}
                            placeholder="Enter your phone number"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            style={dynamicStyles.input}
                            placeholder="Enter your email"
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
                    <Text style={dynamicStyles.sectionTitle}>Emergency Contact</Text>
                    
                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Emergency Contact Name</Text>
                        <TextInput
                            value={emergencyContactName}
                            onChangeText={setEmergencyContactName}
                            style={dynamicStyles.input}
                            placeholder="Enter emergency contact name"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Emergency Contact Number</Text>
                        <TextInput
                            value={emergencyContactNumber}
                            onChangeText={setEmergencyContactNumber}
                            style={dynamicStyles.input}
                            placeholder="Enter emergency contact number"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={dynamicStyles.fieldContainer}>
                        <Text style={dynamicStyles.label}>Relationship</Text>
                        <TextInput
                            value={emergencyContactRelationship}
                            onChangeText={setEmergencyContactRelationship}
                            style={dynamicStyles.input}
                            placeholder="e.g., Spouse, Parent, Friend"
                            placeholderTextColor={isDark ? '#999' : '#aaa'}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={dynamicStyles.buttonContainer}>
                    <Pressable style={dynamicStyles.cancelButton} onPress={handleCancel}>
                        <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={dynamicStyles.saveButton} onPress={handleSave}>
                        <Text style={dynamicStyles.saveButtonText}>Save Changes</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}