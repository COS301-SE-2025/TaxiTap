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
  const { t } = useLanguage();
  const { showInfo } = useAlertHelpers();

  const handleContactSupport = () => {
    showInfo(t('help:support'), t('help:supportEmail'));
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
        {/* Header Section */}
        <View style={dynamicStyles.headerSection}>
          <Text style={dynamicStyles.headerTitle}>Help Manual</Text>
        </View>

        {/* User Manual Section */}
        <Text style={dynamicStyles.sectionHeader}>User Manual</Text>
        <View style={dynamicStyles.section}>
          <MenuItemComponent
            icon="document-text-outline"
            title={t('help:howToNavigateApp')}
            subtitle={t('help:linkToManual')}
            onPress={() => Linking.openURL('https://raw.githubusercontent.com/COS301-SE-2025/Taxi-Tap/main/docs/Taxi%20Tap%20User%20Manual.pdf')}
            isLink={true}
          />
        </View>

        {/* FAQ Section */}
        <Text style={dynamicStyles.sectionHeader}>Frequently Asked Questions</Text>
        <View style={dynamicStyles.section}>
                     <MenuItemComponent
             icon="car-outline"
             title={t('help:howToBookRide')}
             subtitle={t('help:bookRideAnswer')}
             showArrow={false}
           />
           <MenuItemComponent
             icon="swap-horizontal-outline"
             title={t('help:howToSwitchRoles')}
             subtitle={t('help:switchRolesAnswer')}
             showArrow={false}
           />
           <MenuItemComponent
             icon="key-outline"
             title={t('help:forgotPassword')}
             subtitle={t('help:forgotPasswordAnswer')}
             showArrow={false}
           />
          <View style={[dynamicStyles.menuItem, dynamicStyles.lastMenuItem]}>
            <View style={dynamicStyles.menuItemLeft}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="help-circle-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.textContainer}>
                <Text style={dynamicStyles.menuItemText}>{t('help:howToContactSupport')}</Text>
                <Text style={dynamicStyles.menuItemSubtitle}>{t('help:contactSupportAnswer')}</Text>
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