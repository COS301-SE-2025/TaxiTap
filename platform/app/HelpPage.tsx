import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAlertHelpers } from '../components/AlertHelpers';

export default function HelpPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const { showInfo } = useAlertHelpers();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    support: {
      en: "Support",
      zu: "Ukusekela",
      tn: "Tshegetso",
      af: "Ondersteuning"
    },
    supportEmail: {
      en: "support@taxitap.com",
      zu: "support@taxitap.com",
      tn: "support@taxitap.com",
      af: "support@taxitap.com"
    },
    userManual: {
      en: "User Manual",
      zu: "Incwadi Yomsebenzisi",
      tn: "Buka ya Modirisi",
      af: "Gebruikershandleiding"
    },
    howToNavigateApp: {
      en: "How to Navigate the App",
      zu: "Indlela Yokuhamba Kwenhlelo",
      tn: "Mokgwa wa go Tsamaya mo Apping",
      af: "Hoe om die App te Navigeer"
    },
    linkToManual: {
      en: "Complete guide to using Taxi Tap",
      zu: "Umhlahlandlela ophelele wokusebenzisa i-Taxi Tap",
      tn: "Tataiso e e Phelele ya go Dirisa Taxi Tap",
      af: "Volledige gids vir die gebruik van Taxi Tap"
    },
    frequentlyAskedQuestions: {
      en: "Frequently Asked Questions",
      zu: "Imibuzo Evame Ukubuzwa",
      tn: "Dipotso tse di Botswang ka Nako e Ntsi",
      af: "Gereelde Vrae"
    },
    howToSwitchRoles: {
      en: "How do I switch between passenger and driver?",
      zu: "Ngishintshela kanjani phakathi komhambi nomshayeli?",
      tn: "Ke ka fetogela jang gare ga moleledi le mokgweetsi?",
      af: "Hoe skakel ek tussen passasier en bestuurder?"
    },
    switchRolesAnswer: {
      en: "Go to your profile and tap 'Switch Profile'",
      zu: "Iya kuphrofayili yakho bese uthepha 'Shintsha Iphrofayili'",
      tn: "Tsamaya go profaele ya gago mme o tlhase 'Fetola Profaele'",
      af: "Gaan na jou profiel en tik 'Skakel Profiel'"
    },
    forgotPassword: {
      en: "I forgot my password",
      zu: "Ngikhohlwe iphasiwedi yami",
      tn: "Ke lebetse leleme la me la sephiri",
      af: "Ek het my wagwoord vergeet"
    },
    forgotPasswordAnswer: {
      en: "Contact support to reset your password",
      zu: "Thintana nosizo ukuze ubuyisele iphasiwedi yakho",
      tn: "Bua le tshegetso go fetola leleme la gago la sephiri",
      af: "Kontak ondersteuning om jou wagwoord te herstel"
    },
    howToContactSupport: {
      en: "How do I contact support?",
      zu: "Ngithintana kanjani nosizo?",
      tn: "Ke ka bua jang le tshegetso?",
      af: "Hoe kontak ek ondersteuning?"
    },
    contactSupportAnswer: {
      en: "Email us at support@taxitap.com",
      zu: "Sithumelele i-imeyili ku-support@taxitap.com",
      tn: "Re romelle email go support@taxitap.com",
      af: "Stuur vir ons 'n e-pos na support@taxitap.com"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const handleContactSupport = () => {
    showInfo(getTranslation('support'), getTranslation('supportEmail'));
  };

  const handleBackPress = () => {
    router.back();
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    navigationHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
      marginRight: 52, // Compensate for back button width to center title
    },
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },
    headerSection: {
      alignItems: 'center',
      // paddingVertical: 32,
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
        <Text style={dynamicStyles.sectionHeader}>{getTranslation('userManual')}</Text>
        <View style={dynamicStyles.section}>
          <MenuItemComponent
            icon="document-text-outline"
            title={getTranslation('howToNavigateApp')}
            subtitle={getTranslation('linkToManual')}
            onPress={() => Linking.openURL('https://drive.google.com/file/d/1jbRkhZWS7fsNdYvHlI6o9QoXA5lHsZj4/view?usp=drive_link')}
            isLink={true}
          />
        </View>

        {/* FAQ Section */}
        <Text style={dynamicStyles.sectionHeader}>{getTranslation('frequentlyAskedQuestions')}</Text>
        <View style={dynamicStyles.section}>
          <MenuItemComponent
            icon="swap-horizontal-outline"
            title={getTranslation('howToSwitchRoles')}
            subtitle={getTranslation('switchRolesAnswer')}
            showArrow={false}
          />
          <MenuItemComponent
            icon="key-outline"
            title={getTranslation('forgotPassword')}
            subtitle={getTranslation('forgotPasswordAnswer')}
            showArrow={false}
          />
          <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="help-circle-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.textContainer}>
                <Text style={dynamicStyles.menuItemText}>{getTranslation('howToContactSupport')}</Text>
                <Text style={dynamicStyles.menuItemSubtitle}>{getTranslation('contactSupportAnswer')}</Text>
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