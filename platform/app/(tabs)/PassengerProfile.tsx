import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

export default function PassengerProfile() {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const router = useRouter();
    const { user, logout, updateUserRole, updateUserName, updateAccountType } = useUser();
    const { updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Initialize name from user context
    useEffect(() => {
      if (user) {
          setName(user.name || '');
          setNumber(user.phoneNumber || '');
      }
    }, [user]);

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

    // Query user data from Convex using the user ID from context
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Mutations for switching roles
    const switchPassengerToBoth = useMutation(api.functions.users.UserManagement.switchPassengertoBoth.switchPassengerToBoth);
    const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);

    const handleSignout = async () => {
        await logout();
        router.push('../LandingPage');
    };

    const handleNameChange = (newName: string) => {
        setName(newName);
    };

    const handleNumberChange = (newNumber: string) => {
        setNumber(newNumber);
    };

    const handleSwitchToDriver = async () => {
        try {
            if (!user?.id) {
                Alert.alert('Not Found', 'User data not found');
                return;
            }

            // First time switching - user is currently passenger only
            if ((convexUser?.accountType || user.accountType) === 'passenger') {
                Alert.alert(
                    'First Time Switching',
                    'This is your first time switching to driver mode. Your account will be upgraded to support both passenger and driver roles.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Continue',
                            onPress: async () => {
                                try {
                                    // Upgrade passenger to both first
                                    await switchPassengerToBoth({ 
                                        userId: user.id as Id<"taxiTap_users"> 
                                    });
                                    
                                    // Then switch active role to driver
                                    await switchActiveRole({ 
                                        userId: user.id as Id<"taxiTap_users">, 
                                        newRole: 'driver' as const
                                    });
                                    
                                    // Update context
                                    await updateAccountType('both');
                                    await updateUserRole('driver');
                                    
                                    console.log('Success', 'Successfully switched to driver mode!');
                                    router.push('../DriverOffline');
                                } catch (error: any) {
                                    console.log('Error', error.message || 'Failed to switch to driver mode');
                                }
                            },
                        },
                    ]
                );
            } 
            // User already has both account types - just switch active role
            else if ((convexUser?.accountType || user.accountType) === 'both') {
                Alert.alert(
                    'Switch Profile',
                    'Are you sure you want to switch to the driver profile?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Yes',
                            onPress: async () => {
                                try {
                                    // Switch active role to driver
                                    await switchActiveRole({ 
                                        userId: user.id as Id<"taxiTap_users">, 
                                        newRole: 'driver' as const
                                    });
                                    
                                    // Update context
                                    await updateUserRole('driver');
                                    
                                    console.log('Success', 'Switched to driver mode!');
                                    router.push('../DriverOffline');
                                } catch (error: any) {
                                    console.log('Error', error.message || 'Failed to switch to driver mode');
                                }
                            },
                        },
                    ]
                );
            } else {
                console.log('Error', 'Invalid account type for switching to driver mode');
            }
        } catch {
            console.log('Error', 'An unexpected error occurred');
        }
    };

    const handleSave = async () => {
        try {
            if (!user?.id) {
                Alert.alert('Not found', 'User not found');
                return;
            }
            // Update name in context
            if (name !== user.name) {
                await updateUserName(name);
            }
            // Update number if changed
            if (number !== user.phoneNumber) {
                await updateNumber(number);
            }
            Alert.alert('Success', 'Profile saved successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save profile');
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
        headerText: {
            color: theme.text,
            fontSize: 22,
            fontWeight: '600',
            marginBottom: 16,
        },
        card: {
            backgroundColor: theme.card,
            borderRadius: 16,
            padding: 20,
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 4,
            alignItems: 'center',
            marginBottom: 30,
            borderWidth: isDark ? 1 : 0,
            borderColor: theme.border,
        },
        fieldContainer: {
            alignSelf: 'stretch',
            marginBottom: 12,
        },
        label: {
            fontWeight: 'bold',
            fontSize: 16,
            marginBottom: 4,
            color: theme.text,
        },
        input: {
            backgroundColor: isDark ? theme.surface : '#fff',
            borderRadius: 8,
            paddingHorizontal: 12,
            height: 44,
            fontSize: 16,
            borderColor: isDark ? theme.border : '#ddd',
            borderWidth: 1,
            color: theme.text,
        },
        button: {
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 30,
            alignItems: 'center',
            marginBottom: 16,
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowRadius: 4,
            elevation: 3,
        },
        buttonText: {
            color: isDark ? '#121212' : '#fff',
            fontWeight: 'bold',
            fontSize: 18,
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
            <Text style={dynamicStyles.headerText}>Passenger Profile</Text>

            <View style={dynamicStyles.card}>
              <Pressable
                onPress={handleUploadPhoto}
                style={{
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  marginTop: 20,
                }}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    resizeMode="cover"
                    style={{ width: 150, height: 150, borderRadius: 75 }}
                  />
                ) : (
                  <Ionicons name="person-circle" size={150} color={theme.text} />
                )}
              </Pressable>

              <View style={dynamicStyles.fieldContainer}>
                <Text style={dynamicStyles.label}>Name:</Text>
                <TextInput
                  value={name}
                  onChangeText={handleNameChange}
                  style={dynamicStyles.input}
                  placeholder="Enter name"
                  placeholderTextColor={isDark ? '#999' : '#aaa'}
                />
              </View>

              <View style={dynamicStyles.fieldContainer}>
                <Text style={dynamicStyles.label}>Number:</Text>
                <TextInput
                  value={number}
                  onChangeText={handleNumberChange}
                  style={dynamicStyles.input}
                  placeholder="Enter number"
                  placeholderTextColor={isDark ? '#999' : '#aaa'}
                />
              </View>
            </View>

            <Pressable style={dynamicStyles.button} onPress={handleSave}>
                <Text style={dynamicStyles.buttonText}>Save Profile</Text>
            </Pressable>

            <Pressable style={dynamicStyles.button} onPress={handleSwitchToDriver}>
                <Text style={dynamicStyles.buttonText}>Switch to Driver Profile</Text>
            </Pressable>

            <Pressable style={dynamicStyles.button} onPress={handleSignout}>
                <Text style={dynamicStyles.buttonText}>Sign Out</Text>
            </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
}