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
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';

export default function PassengerProfile() {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const router = useRouter();
    const { user, logout, updateUserRole, updateUserName, updateAccountType } = useUser();
    const { updateNumber } = useUser();
    const { theme, isDark } = useTheme();
    const { currentLanguage } = useLanguage();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();

    // Supported languages type
    type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

    // Hardcoded translations for all UI text
    const translations: Record<string, Record<SupportedLanguage, string>> = {
        success: {
            en: "Success",
            zu: "Impumelelo",
            tn: "Katlego",
            af: "Sukses"
        },
        successfullySwitchedToDriver: {
            en: "Successfully switched to driver profile",
            zu: "Ngishintshele kuphrofayili yomshayeli ngempumelelo",
            tn: "Go fetogile go profaele ya mokgweetsi ka katlego",
            af: "Suksesvol na bestuurderprofiel oorgeskakel"
        },
        switchProfile: {
            en: "Switch Profile",
            zu: "Shintsha Iphrofayili",
            tn: "Fetola Profaele",
            af: "Skakel Profiel"
        },
        switchProfileMessage: {
            en: "Are you sure you want to switch to driver profile? This will change your account type.",
            zu: "Uqinisekile ukuthi ufuna ukushintshela kuphrofayili yomshayeli? Lokhu kuzoshintsha uhlobo lwe-akhawunti yakho.",
            tn: "O tlhomphe gore o batla go fetogela profaeleng ya mokgweetsi? Seno se tla fetola mofuta wa akhaonte ya gago.",
            af: "Is jy seker jy wil na bestuurderprofiel skakel? Dit sal jou rekeningtipe verander."
        },
        switchedToDriverMode: {
            en: "Switched to driver mode",
            zu: "Ngishintshela kwimodi yomshayeli",
            tn: "Go fetogile go mokgwa wa mokgweetsi",
            af: "Na bestuurdermodus oorgeskakel"
        },
        yourName: {
            en: "Your Name",
            zu: "Igama Lakho",
            tn: "Leina la Gago",
            af: "Jou Naam"
        },
        passenger: {
            en: "Passenger",
            zu: "Umhambi",
            tn: "Moleledi",
            af: "Passasier"
        },
        account: {
            en: "Account",
            zu: "I-akhawunti",
            tn: "Akhaonte",
            af: "Rekening"
        },
        personalInfo: {
            en: "Personal Information",
            zu: "Ulwazi Lwomuntu Siqu",
            tn: "Tshedimosetso ya Motho",
            af: "Persoonlike Inligting"
        },
        switchToDriverProfile: {
            en: "Switch to Driver Profile",
            zu: "Shintsha kuphrofayili yomshayeli",
            tn: "Fetola go Profaele ya Mokgweetsi",
            af: "Skakel na Bestuurderprofiel"
        },
        wallet: {
            en: "Wallet",
            zu: "Isikhwama",
            tn: "Mokotla",
            af: "Beursie"
        },
        MyWallet: {
            en: "My Wallet",
            zu: "Isikhwama Sami",
            tn: "Mokotla wa Me",
            af: "My Beursie"
        },
        savedPlaces: {
            en: "Saved Places",
            zu: "Izindawo Ezilondolozile",
            tn: "Mafelo a a Bolokilweng",
            af: "Gestoorde Plekke"
        },
        addHomeAddress: {
            en: "Add Home Address",
            zu: "Engeza Ikheli Lasekhaya",
            tn: "Tsenya Aterese ya Gae",
            af: "Voeg Tuisadres By"
        },
        addWorkAddress: {
            en: "Add Work Address",
            zu: "Engeza Ikheli Lomsebenzi",
            tn: "Tsenya Aterese ya Tiro",
            af: "Voeg Werkadres By"
        },
        recentFeedback: {
            en: "Recent Feedback",
            zu: "Impendulo Yakamuva",
            tn: "Dikakanyo tsa Maabane",
            af: "Onlangse Terugvoer"
        },
        reviews: {
            en: "reviews",
            zu: "izibuyekezo",
            tn: "dikakanyo",
            af: "resensies"
        },
        latestReview: {
            en: "Latest Review",
            zu: "Isibuyekezo Sakamuva",
            tn: "Kakanyo ya Maabane",
            af: "Laaste Resensie"
        },
        viewAllFeedback: {
            en: "View All Feedback",
            zu: "Bona Zonke Izimpendulo",
            tn: "Bona Dikakanyo Tsotlhe",
            af: "Bekyk Alle Terugvoer"
        },
        noFeedbackYet: {
            en: "No Feedback Yet",
            zu: "Awukho Ukupendula Okwamanje",
            tn: "Ga go na Dikakanyo Go Fitlha Jaanong",
            af: "Nog Geen Terugvoer Nie"
        },
        settings: {
            en: "Settings",
            zu: "Izilungiselelo",
            tn: "Dipeelo",
            af: "Instellings"
        },
        logOut: {
            en: "Log Out",
            zu: "Phuma",
            tn: "Tswa",
            af: "Teken Uit"
        }
    } as const;

    // Type-safe translation getter
    const getTranslation = (key: keyof typeof translations) => {
        return translations[key][currentLanguage as SupportedLanguage];
    };

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
          aspect: [1, 1]
        });
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

    // Query recent feedback for preview
    const recentFeedback = useQuery(
        api.functions.feedback.showFeedback.showFeedbackPassenger,
        user?.id ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    // Query loyal member status
    const loyalMemberStatus = useQuery(
        api.functions.users.UserManagement.getLoyalMemberStatus.getLoyalMemberStatus,
        user?.id ? { userId: user.id as Id<'taxiTap_users'> } : 'skip'
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
                          showGlobalSuccess(getTranslation('success'), getTranslation('successfullySwitchedToDriver'));
                          router.push('../DriverOffline');
                        } catch (error: any) {
                          showGlobalError('Error', error.message || 'Failed to switch to driver mode');
                        }
                    }, style: 'default' },
                  ],
                });
            } else if ((convexUser?.accountType || user.accountType) === 'both') {
                showGlobalAlert({
                  title: getTranslation('switchProfile'),
                  message: getTranslation('switchProfileMessage'),
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
                          showGlobalSuccess(getTranslation('success'), getTranslation('switchedToDriverMode'));
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
        router.push('../PersonalInfoEdit');
    };

    const handleAddHomeAddress = () => {
        router.push('../AddHomeAddress');
    };

    const handleAddWorkAddress = () => {
        router.push('../AddWorkAddress');
    };

    const handleViewFeedback = () => {
        router.push('/FeedbackHistoryScreen');
    };

    const handleWallet = () => {
    if (!user?.id) {
        showGlobalError('Error', 'User not found');
        return;
    }

    router.push({
        pathname: '/Wallet',
        params: { passengerId: user.id },
    });
    };

    type MenuItemProps = {
        icon: keyof typeof Ionicons.glyphMap;
        title: string;
        onPress: () => void;
        showArrow?: boolean;
        isSpecial?: boolean;
        isDestructive?: boolean;
    };
      
    const MenuItemComponent: React.FC<MenuItemProps> = ({ 
        icon, 
        title, 
        onPress, 
        showArrow = true, 
        isSpecial = false,
        isDestructive = false 
    }) => (
        <Pressable 
            style={[
                dynamicStyles.menuItem,
                isSpecial && dynamicStyles.specialMenuItem,
                isDestructive && dynamicStyles.destructiveMenuItem
            ]} 
            onPress={onPress}
            android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
        >
            <View style={dynamicStyles.menuItemLeft}>
                <View style={[
                    dynamicStyles.iconContainer,
                    isSpecial && dynamicStyles.specialIconContainer,
                    isDestructive && dynamicStyles.destructiveIconContainer
                ]}>
                    <Ionicons 
                        name={icon} 
                        size={20} 
                        color={isDestructive ? '#FF3B30' : theme.text} 
                    />
                </View>
                <Text style={[
                    dynamicStyles.menuItemText,
                    isDestructive && dynamicStyles.destructiveText
                ]}>
                    {title}
                </Text>
            </View>
            {showArrow && (
                <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color={isDark ? theme.border : '#C7C7CC'} 
                />
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
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 40,
        },
        headerSection: {
            alignItems: 'center',
            paddingVertical: 32,
            marginBottom: 24,
        },
        profileImageContainer: {
            position: 'relative',
            marginBottom: 16,
        },
        profileImage: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        cameraIconOverlay: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: '#f90',
            borderRadius: 14,
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.background,
        },
        userName: {
            fontSize: 28,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 4,
            textAlign: 'center',
        },
        userRole: {
            fontSize: 16,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            fontWeight: '500',
            textTransform: 'capitalize',
        },
        sectionHeader: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 8,
            paddingHorizontal: 4,
        },
        section: {
            backgroundColor: theme.card,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
            overflow: 'hidden',
        },
        menuItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            minHeight: 56,
        },
        lastMenuItem: {
            borderBottomWidth: 0,
        },
        menuItemLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        iconContainer: {
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        specialIconContainer: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        },
        destructiveIconContainer: {
            backgroundColor: 'rgba(255, 59, 48, 0.15)',
        },
        menuItemText: {
            fontSize: 17,
            color: theme.text,
            fontWeight: '400',
            flex: 1,
        },
        destructiveText: {
            color: '#FF3B30',
        },
        specialMenuItem: {
            // No special styling needed, handled by icon container
        },
        destructiveMenuItem: {
            // No special styling needed, handled by text and icon
        },
        feedbackPreview: {
            padding: 16,
            borderRadius: 12,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
        feedbackPreviewHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        feedbackPreviewTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
        },
        feedbackPreviewRating: {
            fontSize: 16,
            fontWeight: '600',
            color: '#f90',
        },
        feedbackPreviewComment: {
            fontSize: 14,
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            marginBottom: 12,
            fontStyle: 'italic',
        },
        feedbackCount: {
            fontSize: 14,
            color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            fontWeight: '500',
        },
        badgesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 12,
            gap: 8,
        },
    });
    
    if (!user) {
        return (
          <SafeAreaView style={dynamicStyles.safeArea}>
            <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <LoadingSpinner size="large" />
            </View>
          </SafeAreaView>
        );
    }

    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ScrollView 
            contentContainerStyle={dynamicStyles.container}
            showsVerticalScrollIndicator={false}
        >
            {/* Header Section with Profile Picture and Name */}
            <View style={dynamicStyles.headerSection}>
                <Pressable onPress={handleUploadPhoto} style={dynamicStyles.profileImageContainer}>
                    <View style={dynamicStyles.profileImage}>
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={{ width: 100, height: 100, borderRadius: 50 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <Ionicons name="person" size={48} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
                        )}
                    </View>
                    <View style={dynamicStyles.cameraIconOverlay}>
                        <Ionicons name="camera" size={14} color="white" />
                    </View>
                </Pressable>
                <Text style={dynamicStyles.userName}>{name || getTranslation('yourName')}</Text>
                <Text style={dynamicStyles.userRole}>{getTranslation('passenger')}</Text>
            </View>

            {/* Badges Section */}
            <View style={dynamicStyles.badgesContainer}>
                {/* Custom Loyal Member Badge */}
                {loyalMemberStatus?.isLoyalMember && (
                    <View style={{
                        backgroundColor: '#34C759',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'center',
                        marginTop: 8,
                    }}>
                        <Ionicons name="trophy" size={16} color="white" style={{marginRight: 6}} />
                        <Text style={{color: 'white', fontWeight: '600', fontSize: 14}}>
                            Loyal Member
                        </Text>
                    </View>
                )}
            </View>

            {/* Account Section */}
            <Text style={dynamicStyles.sectionHeader}>{getTranslation('account')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="person-outline"
                    title={getTranslation('personalInfo')}
                    onPress={handlePersonalInfo}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <View style={dynamicStyles.iconContainer}>
                            <Ionicons name="car-outline" size={20} color={theme.text} />
                        </View>
                        <Text style={dynamicStyles.menuItemText}>{getTranslation('switchToDriverProfile')}</Text>
                    </View>
                    <Pressable onPress={handleSwitchToDriver}>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
                    </Pressable>
                </View>
            </View>

            <Text style={dynamicStyles.sectionHeader}>{getTranslation('wallet')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="wallet-outline"
                    title={getTranslation('MyWallet')}
                    onPress={handleWallet}
                />
            </View>

            {/* Saved Places Section */}
            <Text style={dynamicStyles.sectionHeader}>{getTranslation('savedPlaces')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="home-outline"
                    title={getTranslation('addHomeAddress')}
                    onPress={handleAddHomeAddress}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <View style={dynamicStyles.iconContainer}>
                            <Ionicons name="briefcase-outline" size={20} color={theme.text} />
                        </View>
                        <Text style={dynamicStyles.menuItemText}>{getTranslation('addWorkAddress')}</Text>
                    </View>
                    <Pressable onPress={handleAddWorkAddress}>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
                    </Pressable>
                </View>
            </View>

            {/* Feedback History Section */}
            <Text style={dynamicStyles.sectionHeader}>
                {getTranslation('recentFeedback')}
                {recentFeedback && recentFeedback.length > 0 && (
                    <Text style={dynamicStyles.feedbackCount}> • {recentFeedback.length} {getTranslation('reviews')}</Text>
                )}
            </Text>
            <View style={dynamicStyles.section}>
                {recentFeedback && recentFeedback.length > 0 ? (
                    <View style={dynamicStyles.feedbackPreview}>
                        <View style={dynamicStyles.feedbackPreviewHeader}>
                            <Text style={dynamicStyles.feedbackPreviewTitle}>{getTranslation('latestReview')}</Text>
                            <Text style={dynamicStyles.feedbackPreviewRating}>
                                ⭐ {recentFeedback[0].rating}/5
                            </Text>
                        </View>
                        {recentFeedback[0].comment && (
                            <Text style={dynamicStyles.feedbackPreviewComment} numberOfLines={2}>
                                "{recentFeedback[0].comment}"
                            </Text>
                        )}
                        <MenuItemComponent
                            icon="chatbubble-ellipses-outline"
                            title={getTranslation('viewAllFeedback')}
                            onPress={handleViewFeedback}
                            showArrow={true}
                        />
                    </View>
                ) : (
                    <MenuItemComponent
                        icon="chatbubble-ellipses-outline"
                        title={getTranslation('noFeedbackYet')}
                        onPress={handleViewFeedback}
                        showArrow={true}
                    />
                )}
            </View>

            {/* Settings Section */}
            <Text style={dynamicStyles.sectionHeader}>{getTranslation('settings')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="log-out-outline"
                    title={getTranslation('logOut')}
                    onPress={handleSignout}
                    isDestructive={true}
                />
            </View>
        </ScrollView>
      </SafeAreaView>
    );
}