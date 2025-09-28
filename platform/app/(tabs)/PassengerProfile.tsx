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
    
    // Hardcoded translations
    const translations = {
        en: {
            success: "Success",
            successfullySwitchedToDriver: "Successfully switched to driver mode!",
            switchProfile: "Switch Profile",
            switchProfileMessage: "You already have a driver profile. Switch to driver mode?",
            switchedToDriverMode: "Switched to driver mode!",
            yourName: "Your Name",
            passenger: "Passenger",
            account: "Account",
            personalInfo: "Personal Info",
            switchToDriverProfile: "Switch to Driver Profile",
            wallet: "Wallet",
            myWallet: "My Wallet",
            savedPlaces: "Saved Places",
            addHomeAddress: "Add Home Address",
            addWorkAddress: "Add Work Address",
            recentFeedback: "Recent Feedback",
            viewAllFeedback: "View All Feedback",
            noFeedbackYet: "No feedback yet",
            settings: "Settings",
            logOut: "Log Out",
            notFound: "Not Found",
            userDataNotFound: "User data not found",
            firstTimeSwitching: "First Time Switching",
            firstTimeSwitchingMessage: "This will upgrade your account to support both passenger and driver roles.",
            cancel: "Cancel",
            continue: "Continue"
        },
        tn: {
            success: "Katlego",
            successfullySwitchedToDriver: "Go fetogile go mokgweetsi ka katlego!",
            switchProfile: "Fetola Profaile",
            switchProfileMessage: "O na le profaile ya mokgweetsi. Fetola go mokgweetsi?",
            switchedToDriverMode: "Go fetogile go mokgweetsi!",
            yourName: "Leina la Gago",
            passenger: "Mopalami",
            account: "Akhaonto",
            personalInfo: "Tshedimosetso ya Botho",
            switchToDriverProfile: "Fetola go Profaile ya Mokgweetsi",
            wallet: "Wallet",
            myWallet: "Wallet ya Me",
            savedPlaces: "Mafelo a a Bolokilweng",
            addHomeAddress: "Tsenya Aterese ya Gae",
            addWorkAddress: "Tsenya Aterese ya Tiro",
            recentFeedback: "Dikakaretso tsa Bokhutshwane",
            viewAllFeedback: "Bona Dikakaretso Tsotlhe",
            noFeedbackYet: "Ga go na dikakaretso go fitlha jaanong",
            settings: "Dilao",
            logOut: "Tswa",
            notFound: "Ga e Bonwe",
            userDataNotFound: "Tshedimosetso ya mosebenzisi ga e bonwe",
            firstTimeSwitching: "Go Fetola ka Nako ya Ntlha",
            firstTimeSwitchingMessage: "Seno se tla tokafatsa akhaonto ya gago go tshegetsa boemo jwa mopalami le mokgweetsi.",
            cancel: "Khansela",
            continue: "Tswela Pele"
        },
        zu: {
            success: "Impumelelo",
            successfullySwitchedToDriver: "Kushintshwe ngempumelelo kwimodi yomshayeli!",
            switchProfile: "Shintsha Iphrofayili",
            switchProfileMessage: "Usenayo iphrofayili yomshayeli. Shintsha kwimodi yomshayeli?",
            switchedToDriverMode: "Kushintshwe kwimodi yomshayeli!",
            yourName: "Igama Lakho",
            passenger: "Umgibeli",
            account: "I-Akhawunti",
            personalInfo: "Ulwazi Lwakho",
            switchToDriverProfile: "Shintsha ku-Iphrofayili Yomshayeli",
            wallet: "I-Wallet",
            myWallet: "I-Wallet Yami",
            savedPlaces: "Izindawo Ezilondoloziwe",
            addHomeAddress: "Faka Ikheli Lasekhaya",
            addWorkAddress: "Faka Ikheli Lomsebenzi",
            recentFeedback: "Impendulo Yakamuva",
            viewAllFeedback: "Bona Wonke Amapendulo",
            noFeedbackYet: "Awukho impendulo okwamanje",
            settings: "Izilungiselelo",
            logOut: "Phuma",
            notFound: "Akutholakali",
            userDataNotFound: "Ulwazi lomsebenzisi alutholakali",
            firstTimeSwitching: "Ukushintsha Okokuqala",
            firstTimeSwitchingMessage: "Lokhu kuzothuthukisa i-akhawunti yakho ukusekela izindima zomgibeli nomshayeli.",
            cancel: "Khansela",
            continue: "Qhubeka"
        },
        af: {
            success: "Sukses",
            successfullySwitchedToDriver: "Suksesvol oorgeskakel na bestuurder modus!",
            switchProfile: "Wissel Profiel",
            switchProfileMessage: "Jy het reeds 'n bestuurder profiel. Wissel na bestuurder modus?",
            switchedToDriverMode: "Oorgeskakel na bestuurder modus!",
            yourName: "Jou Naam",
            passenger: "Passasier",
            account: "Rekening",
            personalInfo: "Persoonlike Inligting",
            switchToDriverProfile: "Wissel na Bestuurder Profiel",
            wallet: "Beursie",
            myWallet: "My Beursie",
            savedPlaces: "Gestoorde Plekke",
            addHomeAddress: "Voeg Tuis Adres By",
            addWorkAddress: "Voeg Werk Adres By",
            recentFeedback: "Onlangse Terugvoer",
            viewAllFeedback: "Bekyk Alle Terugvoer",
            noFeedbackYet: "Nog geen terugvoer nie",
            settings: "Instellings",
            logOut: "Teken Uit",
            notFound: "Nie Gevind Nie",
            userDataNotFound: "Gebruiker data nie gevind nie",
            firstTimeSwitching: "Eerste Keer Wissel",
            firstTimeSwitchingMessage: "Dit sal jou rekening opgradeer om beide passasier en bestuurder rolle te ondersteun.",
            cancel: "Kanselleer",
            continue: "Gaan Voort"
        }
    };
    
    const t = (key: string) => {
        const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
        return translations[lang][key as keyof typeof translations[typeof lang]] || key;
    };
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
                showGlobalError(t('notFound'), t('userDataNotFound'), { duration: 4000, position: 'top', animation: 'slide-down' });
                return;
            }

            if ((convexUser?.accountType || user.accountType) === 'passenger') {
                showGlobalAlert({
                  title: t('firstTimeSwitching'),
                  message: t('firstTimeSwitchingMessage'),
                  type: 'info',
                  duration: 0,
                  position: 'top',
                  animation: 'slide-down',
                  actions: [
                    { label: t('cancel'), onPress: () => {}, style: 'cancel' },
                    { label: t('continue'), onPress: async () => {
                        try {
                          await switchPassengerToBoth({ userId: user.id as Id<'taxiTap_users'> });
                          await switchActiveRole({ userId: user.id as Id<'taxiTap_users'>, newRole: 'driver' });
                          await updateAccountType('both');
                          await updateUserRole('driver');
                          showGlobalSuccess(t('success'), t('successfullySwitchedToDriver'));
                          router.push('../DriverOffline');
                        } catch (error: any) {
                          showGlobalError('Error', error.message || 'Failed to switch to driver mode');
                        }
                    }, style: 'default' },
                  ],
                });
            } else if ((convexUser?.accountType || user.accountType) === 'both') {
                showGlobalAlert({
                  title: t('switchProfile'),
                  message: t('switchProfileMessage'),
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
                          showGlobalSuccess(t('success'), t('switchedToDriverMode'));
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
        router.push('/PersonalInfoEdit');
    };

    const handleAddHomeAddress = () => {
        router.push('/AddHomeAddress');
    };

    const handleAddWorkAddress = () => {
        router.push('/AddWorkAddress');
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
                <Text style={dynamicStyles.userName}>{name || t('yourName')}</Text>
                <Text style={dynamicStyles.userRole}>{t('passenger')}</Text>
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
            <Text style={dynamicStyles.sectionHeader}>{t('account')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="person-outline"
                    title={t('personalInfo')}
                    onPress={handlePersonalInfo}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <View style={dynamicStyles.iconContainer}>
                            <Ionicons name="car-outline" size={20} color={theme.text} />
                        </View>
                        <Text style={dynamicStyles.menuItemText}>{t('switchToDriverProfile')}</Text>
                    </View>
                    <Pressable onPress={handleSwitchToDriver}>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
                    </Pressable>
                </View>
            </View>

            <Text style={dynamicStyles.sectionHeader}>{t('wallet')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="wallet-outline"
                    title={t('myWallet')}
                    onPress={handleWallet}
                />
            </View>

            {/* Saved Places Section */}
            <Text style={dynamicStyles.sectionHeader}>{t('savedPlaces')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="home-outline"
                    title={t('addHomeAddress')}
                    onPress={handleAddHomeAddress}
                />
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <View style={dynamicStyles.iconContainer}>
                            <Ionicons name="briefcase-outline" size={20} color={theme.text} />
                        </View>
                        <Text style={dynamicStyles.menuItemText}>{t('addWorkAddress')}</Text>
                    </View>
                    <Pressable onPress={handleAddWorkAddress}>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
                    </Pressable>
                </View>
            </View>

            {/* Feedback History Section */}
            <Text style={dynamicStyles.sectionHeader}>{t('recentFeedback')}</Text>
            <View style={dynamicStyles.section}>
                <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
                    <View style={dynamicStyles.menuItemLeft}>
                        <View style={dynamicStyles.iconContainer}>
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.text} />
                        </View>
                        <Text style={dynamicStyles.menuItemText}>
                            {recentFeedback && recentFeedback.length > 0 
                                ? t('viewAllFeedback')
                                : t('noFeedbackYet')
                            }
                        </Text>
                    </View>
                    <Pressable onPress={handleViewFeedback}>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
                    </Pressable>
                </View>
            </View>

            {/* Settings Section */}
            <Text style={dynamicStyles.sectionHeader}>{t('settings')}</Text>
            <View style={dynamicStyles.section}>
                <MenuItemComponent
                    icon="log-out-outline"
                    title={t('logOut')}
                    onPress={handleSignout}
                    isDestructive={true}
                />
            </View>
        </ScrollView>
      </SafeAreaView>
    );
}