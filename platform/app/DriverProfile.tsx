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
import * as ImagePicker from 'expo-image-picker';
import { useAlertHelpers } from '../components/AlertHelpers';

export default function DriverProfile() {   
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    
    const router = useRouter();
    const { user, loading, logout, updateUserRole, updateUserName, updateAccountType, updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { t } = useLanguage();
    const { showError, showSuccess, showConfirm } = useAlertHelpers();

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setNumber(user.phoneNumber || '');
        }
    }, [user]);

    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
    );
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/LandingPage');
        }
    }, [user, loading, router]);

    const switchDriverToBoth = useMutation(api.functions.users.UserManagement.switchDrivertoBoth.switchDriverToBoth);
    const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);

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

    const handleVehicle = () => {
        router.push('../VehicleDriver');
    };
    
    const handleEarnings = () => {
        router.push('../EarningsPage');
    };

    const handleRoutes = () => {
    };

    const handlePersonalInfo = () => {
        router.push('../DriverEdit');
    };

    const handleSignout = async () => {
        try {
            await logout();
            router.replace('/LandingPage');
        } catch (error) {
            console.error('Logout error:', error);
            showError('Error', 'Failed to logout. Please try again.');
        }
    };

    const handleSwitchToPassenger = async () => {
        try {
            if (!user?.id) {
                showError('Error', 'User data not loaded');
                return;
            }

            if ((convexUser?.accountType || user.accountType) === 'driver') {
                showConfirm(
                    'First Time Switching to Passenger',
                    'This will upgrade your account to support both passenger and driver roles.',
                    async () => {
                        try {
                            await switchDriverToBoth({ 
                                userId: user.id as Id<"taxiTap_users"> 
                            });
                            
                            await switchActiveRole({ 
                                userId: user.id as Id<"taxiTap_users">, 
                                newRole: 'passenger' as const
                            });
                            
                            await updateAccountType('both');
                            await updateUserRole('passenger');
                            
                            showSuccess('Success', 'Successfully switched to passenger mode!');
                            router.push('../HomeScreen');
                        } catch (error: any) {
                            showError('Error', error.message || 'Failed to switch to passenger mode');
                        }
                    }
                );
            }
            else if ((convexUser?.accountType || user.accountType) === 'both') {
                showConfirm(
                    'Switch Profile',
                    'Are you sure you want to switch to the passenger profile?',
                    async () => {
                        try {
                            await switchActiveRole({ 
                                userId: user.id as Id<"taxiTap_users">, 
                                newRole: 'passenger' as const
                            });

                            await updateUserRole('passenger');
                            
                            showSuccess('Success', 'Switched to passenger mode!');
                            router.push('../HomeScreen');
                        } catch (error: any) {
                            showError('Error', error.message || 'Failed to switch to passenger mode');
                        }
                    }
                );
            } else {
                showError('Error', 'Invalid account type for switching to passenger mode');
            }
        } catch (error: any) {
            showError('Error', 'An unexpected error occurred');
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
                    <Text style={{ color: theme.text }}>{t('driver:loadingUserData')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={dynamicStyles.safeArea}>
            <ScrollView contentContainerStyle={dynamicStyles.container}>
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