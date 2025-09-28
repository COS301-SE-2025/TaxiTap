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

  // Hardcoded translations
  const translations = {
    en: {
      support: "Support",
      supportEmail: "support@taxitap.com",
      userManual: "User Manual",
      howToNavigateApp: "How to Navigate the App",
      linkToManual: "https://taxitap.com/manual",
      frequentlyAskedQuestions: "Frequently Asked Questions",
      howToSwitchRoles: "How do I switch between passenger and driver roles?",
      switchRolesAnswer: "You can switch roles by going to your profile and selecting the role you want to use.",
      forgotPassword: "I forgot my password. What should I do?",
      forgotPasswordAnswer: "Contact support at support@taxitap.com for password reset assistance.",
      howToContactSupport: "How can I contact support?",
      contactSupportAnswer: "You can contact support by email at support@taxitap.com or through the app's help section."
    },
    tn: {
      support: "Tshegetso",
      supportEmail: "tshegetso@taxitap.com",
      userManual: "Buka ya Mosebenzisi",
      howToNavigateApp: "Jang go Tsamaya ka App",
      linkToManual: "https://taxitap.com/manual",
      frequentlyAskedQuestions: "Dipotso tse di Botswang ka Gakale",
      howToSwitchRoles: "Ke tla fetola jang magareng ga bapalami le bakgweetsi?",
      switchRolesAnswer: "O ka fetola maemo ka go tsamaya go profaile ya gago mme o tlhopha moemo o o batlang go o dirisa.",
      forgotPassword: "Ke lebetse leina la gago la go tsena. Ke tshwanetse go dira eng?",
      forgotPasswordAnswer: "Bua le tshegetso go tshegetso@taxitap.com bakeng sa thuso ya go fetola leina la go tsena.",
      howToContactSupport: "Ke ka bua jang le tshegetso?",
      contactSupportAnswer: "O ka bua le tshegetso ka imeile go tshegetso@taxitap.com kgotsa ka karolo ya thuso ya app."
    },
    zu: {
      support: "Ukusekela",
      supportEmail: "ukusekela@taxitap.com",
      userManual: "Incwadi Yomsebenzisi",
      howToNavigateApp: "Ungakwazi Kanjani Ukuhamba Nge-App",
      linkToManual: "https://taxitap.com/manual",
      frequentlyAskedQuestions: "Imibuzo Evame Ukubuzwa",
      howToSwitchRoles: "Ngingashintsha kanjani phakathi kwabagibeli nabashayeli?",
      switchRolesAnswer: "Ungashintsha izindima ngokuthi uye kuphrofayili yakho bese ukhetha indima oyifunayo.",
      forgotPassword: "Ngikhohliwe iphasiwedi yami. Kufanele ngenze njani?",
      forgotPasswordAnswer: "Xhumana nokusekela ku-ukusekela@taxitap.com ukuze uthole usizo lokusetha kabusha iphasiwedi.",
      howToContactSupport: "Ngingaxhumana kanjani nokusekela?",
      contactSupportAnswer: "Ungaxhumana nokusekela nge-imeyili ku-ukusekela@taxitap.com noma ngokusebenzisa isigaba sosizo se-app."
    },
    af: {
      support: "Ondersteuning",
      supportEmail: "ondersteuning@taxitap.com",
      userManual: "Gebruikershandleiding",
      howToNavigateApp: "Hoe om die App te Navigeer",
      linkToManual: "https://taxitap.com/manual",
      frequentlyAskedQuestions: "Gereelde Vrae",
      howToSwitchRoles: "Hoe skakel ek tussen passasier en bestuurder rolle?",
      switchRolesAnswer: "Jy kan rolle skakel deur na jou profiel te gaan en die rol te kies wat jy wil gebruik.",
      forgotPassword: "Ek het my wagwoord vergeet. Wat moet ek doen?",
      forgotPasswordAnswer: "Kontak ondersteuning by ondersteuning@taxitap.com vir wagwoord herstel hulp.",
      howToContactSupport: "Hoe kan ek ondersteuning kontak?",
      contactSupportAnswer: "Jy kan ondersteuning kontak per e-pos by ondersteuning@taxitap.com of deur die app se hulp afdeling."
    }
  };

  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };

  const handleContactSupport = () => {
    showInfo(t('support'), t('supportEmail'));
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