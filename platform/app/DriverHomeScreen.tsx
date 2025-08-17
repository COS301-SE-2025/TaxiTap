import React, { useState } from 'react';
import { View } from 'react-native';
import DriverOffline from './DriverOffline';
import DriverOnline from './DriverOnline';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import type { Id } from '../convex/_generated/dataModel';
import { useAlertHelpers } from '../components/AlertHelpers';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [todaysEarnings] = useState(0.00); 
  const { user, updateUserRole } = useUser();
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