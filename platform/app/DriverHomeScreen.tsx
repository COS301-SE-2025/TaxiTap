import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import DriverOffline from './DriverOffline';
import DriverOnline from './DriverOnline';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Id } from '../convex/_generated/dataModel';
import { useAlertHelpers } from '../components/AlertHelpers';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [todaysEarnings] = useState(0.00); 
  const { user, updateUserRole } = useUser();
  const { currentLanguage } = useLanguage();

  // Hardcoded translations
  const translations = {
    en: {
      error: "Error",
      failedToGoOnline: "Failed to go online as driver.",
      failedToGoOffline: "Failed to go offline as driver."
    },
    tn: {
      error: "Phoso",
      failedToGoOnline: "Go hlolekile go tsamaya ka mokgweetsi.",
      failedToGoOffline: "Go hlolekile go tswa ka mokgweetsi."
    },
    zu: {
      error: "Iphutha",
      failedToGoOnline: "Kuhlulekile ukusebenza njengomshayeli.",
      failedToGoOffline: "Kuhlulekile ukuyeka ukusebenza njengomshayeli."
    },
    af: {
      error: "Fout",
      failedToGoOnline: "Kon nie aanlyn gaan as bestuurder nie.",
      failedToGoOffline: "Kon nie aflyn gaan as bestuurder nie."
    }
  };

  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };
  const { showGlobalError } = useAlertHelpers();
  const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);
  const startWorkSession = useMutation(api.functions.work_sessions.startWorkSession.startWorkSession);
  const endWorkSession = useMutation(api.functions.work_sessions.endWorkSession.endWorkSession);

  const handleGoOnline = async () => {
    try {
      if (user && user.accountType === 'both' && user.role !== 'driver') {
        await switchActiveRole({
          userId: user.id as Id<'taxiTap_users'>,
          newRole: 'driver',
        });
        await updateUserRole('driver');
      } else if (user && user.accountType === 'driver') {
        await updateUserRole('driver');
      }
      if (user) {
        await startWorkSession({
          driverId: user.id as Id<"taxiTap_users">,
        });
      }
      setIsOnline(true);
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('failedToGoOnline'));
      showGlobalError('Error', err.message || 'Failed to go online as driver.', {
        duration: 5000,
        position: 'top',
        animation: 'slide-down',
      });
    }
  };

  const handleGoOffline = async () => {
    try {
      if (user) {
        await endWorkSession({
          driverId: user.id as Id<"taxiTap_users">,
        });
      }
      setIsOnline(false);
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('failedToGoOffline'));
      showGlobalError('Error', err.message || 'Failed to go offline.', {
        duration: 5000,
        position: 'top',
        animation: 'slide-down',
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {isOnline ? (
        <DriverOnline 
          onGoOffline={handleGoOffline} 
          todaysEarnings={todaysEarnings}
        />
      ) : (
        <DriverOffline 
          onGoOnline={handleGoOnline} 
          todaysEarnings={todaysEarnings}
        />
      )}
    </View>
  );
}