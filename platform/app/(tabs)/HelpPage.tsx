import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAlertHelpers } from '../../components/AlertHelpers';

export default function HelpPage() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  
  // Hardcoded translations
  const translations = {
    en: {
      support: "Support",
      supportEmail: "support@taxitap.com",
      userManual: "User Manual",
      howToNavigateApp: "How to Navigate the App",
      linkToManual: "Complete guide to using TaxiTap",
      frequentlyAskedQuestions: "Frequently Asked Questions",
      howToBookRide: "How do I book a ride?",
      bookRideAnswer: "Enter your origin and destination, then select a taxi",
      howToSwitchRoles: "How do I switch between passenger and driver?",
      switchRolesAnswer: "Go to your profile and tap 'Switch to Driver Profile'",
      forgotPassword: "I forgot my password",
      forgotPasswordAnswer: "Contact support for password reset assistance",
      howToContactSupport: "How to Contact Support",
      contactSupportAnswer: "Email us at support@taxitap.com"
    },
    tn: {
      support: "Tshegetso",
      supportEmail: "support@taxitap.com",
      userManual: "Buka ya Mosebenzisi",
      howToNavigateApp: "Jang go Tsamaya mo Apping",
      linkToManual: "Tataiso e e Feletseng ya go Dirisa TaxiTap",
      frequentlyAskedQuestions: "Dipotso tse di Botswang ka Nako e Ntsi",
      howToBookRide: "Ke ka jang go boka leeto?",
      bookRideAnswer: "Tsenya mafelo a go tswa le go ya, mme o kgetha tekisi",
      howToSwitchRoles: "Ke ka jang go fetola magareng ga mopalami le mokgweetsi?",
      switchRolesAnswer: "Ya go profaile ya gago mme o tlhanye 'Fetola go Profaile ya Mokgweetsi'",
      forgotPassword: "Ke lebalegile phetogo ya me",
      forgotPasswordAnswer: "Kgokagana le tshegetso bakeng sa thuso ya go simolola phetogo",
      howToContactSupport: "Jang go Kgokagana le Tshegetso",
      contactSupportAnswer: "Re romela imeile go support@taxitap.com"
    },
    zu: {
      support: "Ukusekela",
      supportEmail: "support@taxitap.com",
      userManual: "Incwadi Yomsebenzisi",
      howToNavigateApp: "Ungazihambisa Kanjani Ku-App",
      linkToManual: "Isikhombisi esiphelele sokusebenzisa i-TaxiTap",
      frequentlyAskedQuestions: "Imibuzo Evame Ukubuzwa",
      howToBookRide: "Ngingabhuka kanjani uhambo?",
      bookRideAnswer: "Faka indawo yokuqala nendawo yokugcina, bese ukhetha itekisi",
      howToSwitchRoles: "Ngingashintsha kanjani phakathi komgibeli nomshayeli?",
      switchRolesAnswer: "Hamba kuphrofayili yakho bese uthinta 'Shintsha ku-Iphrofayili Yomshayeli'",
      forgotPassword: "Ngikhohlwe iphasiwedi yami",
      forgotPasswordAnswer: "Xhumana nokusekelwa ukuze uthole usizo lokusetha kabusha iphasiwedi",
      howToContactSupport: "Ungaxhumana Kanjani Nokusekelwa",
      contactSupportAnswer: "Sithumele i-imeyili ku-support@taxitap.com"
    },
    af: {
      support: "Ondersteuning",
      supportEmail: "support@taxitap.com",
      userManual: "Gebruiker Handleiding",
      howToNavigateApp: "Hoe om die App te Navigeer",
      linkToManual: "Volledige gids vir die gebruik van TaxiTap",
      frequentlyAskedQuestions: "Gereelde Vrae",
      howToBookRide: "Hoe bespreek ek 'n rit?",
      bookRideAnswer: "Voer jou oorsprong en bestemming in, kies dan 'n taxi",
      howToSwitchRoles: "Hoe wissel ek tussen passasier en bestuurder?",
      switchRolesAnswer: "Gaan na jou profiel en tik 'Wissel na Bestuurder Profiel'",
      forgotPassword: "Ek het my wagwoord vergeet",
      forgotPasswordAnswer: "Kontak ondersteuning vir wagwoord reset hulp",
      howToContactSupport: "Hoe om Ondersteuning te Kontak",
      contactSupportAnswer: "E-pos ons by support@taxitap.com"
    }
  };
  
  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };
  const { showInfo } = useAlertHelpers();

  const handleContactSupport = () => {
    showInfo(t('support'), t('supportEmail'));
  };



  type MenuItemProps = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    isLink?: boolean;
  };
    
  const MenuItemComponent: React.FC<MenuItemProps> = ({ 
    icon, 
    title, 
    subtitle,
    onPress, 
    showArrow = true, 
    isLink = false
  }) => (
    <Pressable 
      style={dynamicStyles.menuItem} 
      onPress={onPress}
      android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
    >
      <View style={dynamicStyles.menuItemLeft}>
        <View style={dynamicStyles.iconContainer}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={theme.text} 
          />
        </View>
        <View style={dynamicStyles.textContainer}>
          <Text style={dynamicStyles.menuItemText}>{title}</Text>
          {subtitle && (
            <Text style={dynamicStyles.menuItemSubtitle}>{subtitle}</Text>
          )}
        </View>
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
        headerTitle: {
            fontSize: 28,
            fontWeight: '600',
            color: theme.text,
            textAlign: 'center',
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
    textContainer: {
      flex: 1,
    },
    menuItemText: {
      fontSize: 17,
      color: theme.text,
      fontWeight: '400',
    },
    menuItemSubtitle: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      marginTop: 2,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* User Manual Section */}
        <Text style={dynamicStyles.sectionHeader}>{t('userManual')}</Text>
        <View style={dynamicStyles.section}>
          <MenuItemComponent
            icon="document-text-outline"
            title={t('howToNavigateApp')}
            subtitle={t('linkToManual')}
            onPress={() => Linking.openURL('https://drive.google.com/file/d/1jbRkhZWS7fsNdYvHlI6o9QoXA5lHsZj4/view?usp=drive_link')}
            isLink={true}
          />
        </View>

        {/* FAQ Section */}
        <Text style={dynamicStyles.sectionHeader}>{t('frequentlyAskedQuestions')}</Text>
        <View style={dynamicStyles.section}>
                     <MenuItemComponent
             icon="car-outline"
             title={t('howToBookRide')}
             subtitle={t('bookRideAnswer')}
             showArrow={false}
           />
           <MenuItemComponent
             icon="swap-horizontal-outline"
             title={t('howToSwitchRoles')}
             subtitle={t('switchRolesAnswer')}
             showArrow={false}
           />
           <MenuItemComponent
             icon="key-outline"
             title={t('forgotPassword')}
             subtitle={t('forgotPasswordAnswer')}
             showArrow={false}
           />
          <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="help-circle-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.textContainer}>
                <Text style={dynamicStyles.menuItemText}>{t('howToContactSupport')}</Text>
                <Text style={dynamicStyles.menuItemSubtitle}>{t('contactSupportAnswer')}</Text>
              </View>
            </View>
            <Pressable onPress={handleContactSupport}>
              <Ionicons name="chevron-forward" size={16} color={isDark ? theme.border : '#C7C7CC'} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}