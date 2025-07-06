import React, { useState } from 'react';
import { View } from 'react-native';
import DriverOffline from './DriverOffline';
import DriverOnline from './DriverOnline';

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [todaysEarnings] = useState(0.00); 
  
  const handleGoOnline = () => {
    setIsOnline(true);
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