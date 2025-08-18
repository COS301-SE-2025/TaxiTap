import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { useAlertHelpers } from '../../components/AlertHelpers';

export default function PassengerProfile() {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const router = useRouter();
    const { user, logout, updateUserRole, updateUserName, updateAccountType } = useUser();
    const { updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { t } = useLanguage();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();

    // Initialize name from user context
    useEffect(() => {
      if (user) {
          setName(user.name || '');
          setNumber(user.phoneNumber || '');
      }
    }, [user]);

    const handleUploadPhoto = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 1 });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setImageUri(result.assets[0].uri);
        }
      } catch {}
    };

    // Query user data from Convex using the user ID from context
    const convexUser = useQuery(
        api.functions.users.UserManagement.getUserById.getUserById, 
        user?.id ? { userId: user.id as Id<'taxiTap_users'> } : 'skip'
    );

    // Mutations for switching roles
    const switchPassengerToBoth = useMutation(api.functions.users.UserManagement.switchPassengertoBoth.switchPassengerToBoth);
    const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);

    const handleSignout = async () => { await logout(); router.push('../LandingPage'); };

    const handleSwitchToDriver = async () => {
        try {
            if (!user?.id) {
                showGlobalError('Not Found', 'User data not found', { duration: 4000, position: 'top', animation: 'slide-down' });
                return;
            }

            if ((convexUser?.accountType || user.accountType) === 'passenger') {
                showGlobalAlert({
                  title: 'First Time Switching',
                  message: 'This will upgrade your account to support both passenger and driver roles.',
                  type: 'info',
                  duration: 0,
                  position: 'top',
                  animation: 'slide-down',
                  actions: [
                    { label: 'Cancel', onPress: () => {}, style: 'cancel' },
                    { label: 'Continue', onPress: async () => {
                        try {
                          await switchPassengerToBoth({ userId: user.id as Id<'taxiTap_users'> });
                          await switchActiveRole({ userId: user.id as Id<'taxiTap_users'>, newRole: 'driver' });
                          await updateAccountType('both');
                          await updateUserRole('driver');
                          showGlobalSuccess('Success', 'Successfully switched to driver mode!');
                          router.push('../DriverOffline');
                        } catch (error: any) {
                          showGlobalError('Error', error.message || 'Failed to switch to driver mode');
                        }
                    }, style: 'default' },
                  ],
                });
            } else if ((convexUser?.accountType || user.accountType) === 'both') {
                showGlobalAlert({
                  title: 'Switch Profile',
                  message: 'Are you sure you want to switch to the driver profile?',
                  type: 'info',
                  duration: 0,
                  position: 'top',
                  animation: 'slide-down',
                  actions: [
                    { label: 'Cancel', onPress: () => {}, style: 'cancel' },
                    { label: 'Yes', onPress: async () => {
                        try {
                          await switchActiveRole({ userId: user.id as Id<'taxiTap_users'>, newRole: 'driver' });
                          await updateUserRole('driver');
                          showGlobalSuccess('Success', 'Switched to driver mode!');
                          router.push('../DriverOffline');
                        } catch (error: any) {
                          showGlobalError('Error', error.message || 'Failed to switch to driver mode');
                        }
                    }, style: 'default' },
                  ],
                });
            } else {
                showGlobalError('Error', 'Invalid account type for switching to driver mode');
            }
        } catch (error: any) {
            showGlobalError('Error', 'An unexpected error occurred');
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
                <Text>{t('profile:loadingUserData')}</Text>
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
                <Text style={dynamicStyles.userName}>{name || t('profile:yourName')}</Text>
                <Text style={dynamicStyles.userRole}>{t('profile:passenger')}</Text>
            </View>

            {/* Section 1: Personal Info & Driver Switch */}
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="person-outline"
                    title={t('profile:personalInfo')}
                    onPress={handlePersonalInfo}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <Ionicons name="car-outline" size={24} color={theme.text} />
                        <Text style={dynamicStyles.menuItemText}>{t('profile:switchToDriverProfile')}</Text>
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
                    title={t('profile:addHomeAddress')}
                    onPress={handleAddHomeAddress}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <Ionicons name="briefcase-outline" size={24} color={theme.text} />
                        <Text style={dynamicStyles.menuItemText}>{t('profile:addWorkAddress')}</Text>
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
                    <Text style={dynamicStyles.logoutText}>{t('profile:logOut')}</Text>
                </Pressable>
            </View>
        </ScrollView>
      </SafeAreaView>
    );
}