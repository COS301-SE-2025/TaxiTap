import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import DriverOffline from './DriverOffline';
import DriverOnline from './DriverOnline';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import type { Id } from '../convex/_generated/dataModel';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [todaysEarnings] = useState(0.00); 
  const { user, updateUserRole } = useUser();
  const switchActiveRole = useMutation(api.functions.users.UserManagement.switchActiveRole.switchActiveRole);

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
      setIsOnline(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to go online as driver.');
    }
  };

  const handleGoOffline = () => {
    setIsOnline(false);
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