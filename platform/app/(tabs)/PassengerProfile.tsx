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

    const handlePersonalInfo = () => {
        // Navigate to personal info edit screen
        router.push('../PersonalInfoEdit');
    };

    const handleAddHomeAddress = () => {
        router.push('../AddHomeAddress');
    };

    const handleAddWorkAddress = () => {
        // Navigate to add work address screen
        router.push('../AddWorkAddress');
    };

    type MenuItemProps = {
        icon: keyof typeof Ionicons.glyphMap;
        title: string;
        onPress: () => void;
        showArrow?: boolean;
      };
      
      const MenuItemComponent: React.FC<MenuItemProps> = ({ icon, title, onPress, showArrow = true }) => (
          <Pressable style={dynamicStyles.menuItem} onPress={onPress}>
              <View style={dynamicStyles.menuItemLeft}>
                  <Ionicons name={icon} size={24} color={theme.text} />
                  <Text style={dynamicStyles.menuItemText}>{title}</Text>
              </View>
              {showArrow && (
                  <Ionicons name="chevron-forward" size={20} color={theme.text} />
              )}
          </Pressable>
      );
      

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
            alignItems: 'center',
            marginBottom: 30,
        },
        profileImage: {
            marginBottom: 15,
        },
        userName: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 5,
        },
        userRole: {
            fontSize: 16,
            color: theme.text,
            opacity: 0.7,
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 12,
            marginBottom: 20,
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 4,
            borderWidth: isDark ? 1 : 0,
            borderColor: theme.border,
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? theme.border : '#f0f0f0',
        },
        menuItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        menuItemText: {
            fontSize: 16,
            color: theme.text,
            marginLeft: 15,
        },
        lastMenuItem: {
            borderBottomWidth: 0,
        },
        logoutSection: {
            backgroundColor: theme.card,
            borderRadius: 12,
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 4,
            borderWidth: isDark ? 1 : 0,
            borderColor: theme.border,
        },
        logoutItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 20,
        },
        logoutText: {
            fontSize: 16,
            color: '#FF3B30',
            marginLeft: 15,
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
            {/* Header Section with Profile Picture and Name */}
            <View style={dynamicStyles.headerSection}>
                <Pressable onPress={handleUploadPhoto} style={dynamicStyles.profileImage}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            resizeMode="cover"
                            style={{ width: 80, height: 80, borderRadius: 40 }}
                        />
                    ) : (
                        <Ionicons name="person-circle" size={80} color={theme.text} />
                    )}
                </Pressable>
                <Text style={dynamicStyles.userName}>{name || 'Your Name'}</Text>
                <Text style={dynamicStyles.userRole}>Passenger</Text>
            </View>

            {/* Section 1: Personal Info & Driver Switch */}
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="person-outline"
                    title="Personal Info"
                    onPress={handlePersonalInfo}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <Ionicons name="car-outline" size={24} color={theme.text} />
                        <Text style={dynamicStyles.menuItemText}>Switch to Driver Profile</Text>
                    </View>
                    <Pressable onPress={handleSwitchToDriver}>
                        <Ionicons name="chevron-forward" size={20} color={theme.text} />
                    </Pressable>
                </View>
            </View>

            {/* Section 2: Saved Places */}
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="home-outline"
                    title="Add Home Address"
                    onPress={handleAddHomeAddress}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <Ionicons name="briefcase-outline" size={24} color={theme.text} />
                        <Text style={dynamicStyles.menuItemText}>Add Work Address</Text>
                    </View>
                    <Pressable onPress={handleAddWorkAddress}>
                        <Ionicons name="chevron-forward" size={20} color={theme.text} />
                    </Pressable>
                </View>
            </View>

            {/* Section 3: Logout */}
            <View style={dynamicStyles.logoutSection}>
                <Pressable style={dynamicStyles.logoutItem} onPress={handleSignout}>
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                    <Text style={dynamicStyles.logoutText}>Log Out</Text>
                </Pressable>
            </View>
        </ScrollView>
      </SafeAreaView>
    );
}