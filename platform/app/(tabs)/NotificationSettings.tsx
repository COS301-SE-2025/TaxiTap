// screens/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  StyleSheet, 
  SafeAreaView, 
  Pressable,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '../../contexts/ThemeContext';
import { NotificationService } from '../../services/NotificationService';

export default function NotificationSettings() {
  const router = useRouter();
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Query current notification settings
  const notificationData = useQuery(
    api.functions.users.UserManagement.notificationSettings.getUserNotificationSettings,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Mutation to update settings
  const updateSettings = useMutation(
    api.functions.users.UserManagement.notificationSettings.updateNotificationSettings
  );

  // Load settings when data is available
  useEffect(() => {
    if (notificationData) {
      setNotificationsEnabled(notificationData.notificationsEnabled);
      setSoundEnabled(notificationData.soundEnabled);
      setVibrationEnabled(notificationData.vibrationEnabled);
    }
  }, [notificationData]);

  const handleToggle = async (
    type: 'notifications' | 'sound' | 'vibration',
    newValue: boolean
  ) => {
    const currentSettings = {
      notificationsEnabled,
      soundEnabled,
      vibrationEnabled,
    };

    // Update local state immediately
    switch (type) {
      case 'notifications':
        setNotificationsEnabled(newValue);
        break;
      case 'sound':
        setSoundEnabled(newValue);
        break;
      case 'vibration':
        setVibrationEnabled(newValue);
        break;
    }

    try {
      if (user?.id) {
        const updatedSettings = {
          ...currentSettings,
          [type === 'notifications' ? 'notificationsEnabled' : 
           type === 'sound' ? 'soundEnabled' : 'vibrationEnabled']: newValue,
        };

        await updateSettings({
          userId: user.id as Id<"taxiTap_users">,
          ...updatedSettings,
        });

        // Update NotificationService configuration based on settings
        if (type === 'notifications') {
          if (!newValue) {
            // Disable all notifications
            await NotificationService.cancelAllScheduledNotifications();
          }
        }
      }
    } catch (error) {
      // Revert on error
      switch (type) {
        case 'notifications':
          setNotificationsEnabled(currentSettings.notificationsEnabled);
          break;
        case 'sound':
          setSoundEnabled(currentSettings.soundEnabled);
          break;
        case 'vibration':
          setVibrationEnabled(currentSettings.vibrationEnabled);
          break;
      }
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }
  };

  const SettingItem = ({ 
    title, 
    description, 
    value,
    onToggle,
    disabled = false
  }: { 
    title: string; 
    description: string; 
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={[dynamicStyles.settingItem, disabled && dynamicStyles.disabledItem]}>
      <View style={dynamicStyles.settingContent}>
        <Text style={[dynamicStyles.settingTitle, disabled && dynamicStyles.disabledText]}>
          {title}
        </Text>
        <Text style={[dynamicStyles.settingDescription, disabled && dynamicStyles.disabledText]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: '#4CAF50' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
        disabled={disabled}
      />
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      marginRight: 15,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: 20,
    },
    section: {
      backgroundColor: theme.card,
      marginHorizontal: 20,
      borderRadius: 12,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : '#f0f0f0',
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    disabledItem: {
      opacity: 0.5,
    },
    settingContent: {
      flex: 1,
      marginRight: 15,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.text,
      opacity: 0.7,
    },
    disabledText: {
      opacity: 0.5,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Pressable 
          style={dynamicStyles.backButton} 
          onPress={() => router.push('./PassengerProfile')}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={dynamicStyles.headerTitle}>Notifications</Text>
      </View>

      <View style={dynamicStyles.container}>
        {/* Main Settings */}
        <View style={dynamicStyles.section}>
          <SettingItem
            title="Allow Notifications"
            description="Receive ride updates, driver alerts, and other important notifications"
            value={notificationsEnabled}
            onToggle={(value) => handleToggle('notifications', value)}
          />
          <SettingItem
            title="Sound"
            description="Play sound for notifications"
            value={soundEnabled}
            onToggle={(value) => handleToggle('sound', value)}
            disabled={!notificationsEnabled}
          />
          <View style={[dynamicStyles.settingItem, dynamicStyles.lastSettingItem, !notificationsEnabled && dynamicStyles.disabledItem]}>
            <View style={dynamicStyles.settingContent}>
              <Text style={[dynamicStyles.settingTitle, !notificationsEnabled && dynamicStyles.disabledText]}>
                Vibration
              </Text>
              <Text style={[dynamicStyles.settingDescription, !notificationsEnabled && dynamicStyles.disabledText]}>
                Vibrate for notifications
              </Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={(value) => handleToggle('vibration', value)}
              trackColor={{ false: theme.border, true: '#4CAF50' }}
              thumbColor={vibrationEnabled ? '#fff' : '#f4f3f4'}
              disabled={!notificationsEnabled}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}