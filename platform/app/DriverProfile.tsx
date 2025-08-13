import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from "expo-router";

export default function DriverProfile() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const router = useRouter();
    const { user, logout, updateUserRole, updateUserName, updateAccountType } = useUser();
    const { updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { t } = useLanguage();
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
    const switchDriverToBoth = useMutation(api.functions.users.UserManagement.switchDrivertoBoth.switchDriverToBoth);
    const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);

    const handleVehicle = () => {
        router.push('../VehicleDriver');
    };
    const handleEarnings = () => {
        router.push('../EarningsPage');
    };

    const handleRoutes = () => {
        //router.push('../Routes'); ->change to real name
    };

    const handlePersonalInfo = () => {
        // Navigate to driver personal info edit screen
        router.push('../DriverEdit');
    };

    const handleSignout = async () => {
        await logout();
        router.push('../LandingPage');
    };

    const handleSwitchToPassenger = async () => {
        try {
            if (!user?.id) {
                Alert.alert(t('common:error'), t('driver:userNotLoaded'));
                return;
            }

            // First time switching - user is currently driver only
            if ((convexUser?.accountType || user.accountType) === 'driver') {
                Alert.alert(
                    t('driver:firstTimeSwitchingToPassenger'),
                    t('driver:firstTimeSwitchingToPassengerMessage'),
                    [
                        { text: t('common:cancel'), style: 'cancel' },
                        {
                            text: t('common:continue'),
                            onPress: async () => {
                                try {
                                    // Upgrade driver to both first
                                    await switchDriverToBoth({ 
                                        userId: user.id as Id<"taxiTap_users"> 
                                    });
                                    
                                    // Then switch active role to passenger
                                    await switchActiveRole({ 
                                        userId: user.id as Id<"taxiTap_users">, 
                                        newRole: 'passenger' as const
                                    });
                                    
                                    // Update context
                                    await updateAccountType('both');
                                    await updateUserRole('passenger');
                                    
                                    Alert.alert(t('common:success'), t('driver:successfullySwitchedToPassenger'), [
                                        {
                                            text: 'OK',
                                            onPress: () => {
                                                try {
                                                    router.push('../HomeScreen');
                                                } catch (navError) {
                                                    console.error('Navigation error:', navError);
                                                    Alert.alert('Navigation Error', 'Failed to navigate to home screen');
                                                }
                                            }
                                        }
                                    ]);
                                } catch (error: any) {
                                    Alert.alert('Error', error.message || 'Failed to switch to passenger mode');
                                }
                            },
                        },
                    ]
                );
            } 
            // User already has both account types - just switch active role
            else if ((convexUser?.accountType || user.accountType) === 'both') {
                Alert.alert(
                    t('driver:switchProfile'),
                    t('driver:switchProfileMessage'),
                    [
                        { text: t('common:cancel'), style: 'cancel' },
                        {
                            text: t('common:yes'),
                            onPress: async () => {
                                try {
                                    // Switch active role to passenger
                                    await switchActiveRole({ 
                                        userId: user.id as Id<"taxiTap_users">, 
                                        newRole: 'passenger' as const
                                    });
                                    
                                    // Update context
                                    await updateUserRole('passenger');
                                    
                                    Alert.alert(t('common:success'), t('driver:switchedToPassenger'), [
                                        {
                                            text: t('common:ok'),
                                            onPress: () => {
                                                try {
                                                    router.push('../HomeScreen');
                                                } catch (navError) {
                                                    console.error('Navigation error:', navError);
                                                    Alert.alert(t('driver:navigationError'), t('driver:failedToNavigate'));
                                                }
                                            }
                                        }
                                    ]);
                                } catch (error: any) {
                                    Alert.alert(t('common:error'), error.message || t('driver:failedToSwitch'));
                                }
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(t('common:error'), t('driver:invalidAccountType'));
            }
        } catch (error: any) {
            Alert.alert(t('common:error'), t('driver:unexpectedError'));
        }
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
                    <Text>{t('driver:loadingUserData')}</Text>
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
                    <Text style={dynamicStyles.userName}>{name || t('personalInfo:yourName')}</Text>
                    <Text style={dynamicStyles.userRole}>{t('driver:driver')}</Text>
                </View>

                {/* Section 1: Personal Info & Passenger Switch */}
                <View style={dynamicStyles.section}>
                    <MenuItemComponent
                        icon="person-outline"
                        title={t('personalInfo:personalInformation')}
                        onPress={handlePersonalInfo}
                    />
                    <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                        <View style={dynamicStyles.menuItemLeft}>
                            <Ionicons name="walk-outline" size={24} color={theme.text} />
                            <Text style={dynamicStyles.menuItemText}>{t('driver:switchToPassengerProfile')}</Text>
                        </View>
                        <Pressable onPress={handleSwitchToPassenger}>
                            <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </Pressable>
                    </View>
                </View>

                {/* Section 2: Driver Services */}
                <View style={dynamicStyles.section}>
                    <MenuItemComponent
                        icon="car-outline"
                        title={t('driver:vehicleInfo')}
                        onPress={handleVehicle}
                    />
                    <MenuItemComponent
                        icon="cash-outline"
                        title={t('driver:earningsPage')}
                        onPress={handleEarnings}
                    />
                    <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                        <View style={dynamicStyles.menuItemLeft}>
                            <Ionicons name="map-outline" size={24} color={theme.text} />
                            <Text style={dynamicStyles.menuItemText}>{t('driver:manageRoutes')}</Text>
                        </View>
                        <Pressable onPress={handleRoutes}>
                            <Ionicons name="chevron-forward" size={20} color={theme.text} />
                        </Pressable>
                    </View>
                </View>

                {/* Section 3: Logout */}
                <View style={dynamicStyles.logoutSection}>
                    <Pressable style={dynamicStyles.logoutItem} onPress={handleSignout}>
                        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                        <Text style={dynamicStyles.logoutText}>{t('profile:logOut')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}