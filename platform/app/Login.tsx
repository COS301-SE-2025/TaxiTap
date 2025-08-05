import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { ConvexProvider } from 'convex/react';
import { useUser } from '../contexts/UserContext';
import { useAssetCache } from '../app/hooks/useAssetCache';
import icon from '../assets/images/icon.png'; // Fallback
import google from '../assets/images/google5.png'; // Fallback
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Generate a unique device ID (keep existing function)
const generateDeviceId = async (): Promise<string> => {
  try {
    const existingDeviceId = await AsyncStorage.getItem('deviceId');
    if (existingDeviceId) {
      return existingDeviceId;
    }

    const deviceId = `${Device.osName || 'unknown'}-${Device.deviceName || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await AsyncStorage.setItem('deviceId', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};

export default function Login() {
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const convex = useConvex();
  const { login } = useUser();
  const { cachedAssets, isLoading: assetsLoading, preloadAssets } = useAssetCache();

  // Preload assets on component mount
  useEffect(() => {
    preloadAssets(['logo', 'ui']);
  }, []);

  // Get cached asset URIs or fallback to bundled assets
  const logoUri = cachedAssets['app_logo'] || icon;
  const googleIconUri = cachedAssets['google_icon'] || google;

  const handleLogin = async () => {
    // Keep existing login logic
    if (!number || !password) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }
    const saNumberRegex = /^0(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      Alert.alert('Invalid number', 'Please enter a valid number');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const deviceId = await generateDeviceId();
      const platform = Device.osName === 'iOS' ? 'ios' : 'android';
      const deviceName = Device.deviceName || 'Unknown Device';

      const result = await convex.mutation(api.functions.users.UserManagement.logInWithSMS.loginWithSession, {
        phoneNumber: number,
        password,
        deviceId,
        deviceName,
        platform,
      });

      await login(result.user);
      
      if (result.user.currentActiveRole === 'driver') {
        router.push({
          pathname: '/DriverOffline',
          params: { userId: result.user.id.toString() }
        });
      } else if (result.user.currentActiveRole === 'passenger') {
        router.push({
          pathname: '/HomeScreen',
          params: { userId: result.user.id.toString() }
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message) {
        if (error.message.includes('Driver account is already active on another device')) {
          Alert.alert('Account Already Active', 'Your driver account is currently active on another device. Please log out from the other device first before logging in here.');
        } else if (error.message.includes('User not found')) {
          Alert.alert('Login Failed', 'No account found with this phone number. Please check your phone number or create a new account.');
        } else if (error.message.includes('Invalid password')) {
          Alert.alert('Login Failed', 'Incorrect password. Please try again.');
        } else {
          Alert.alert('Login Failed', 'Unable to log in. Please check your credentials and try again.');
        }
      } else {
        Alert.alert('Login Failed', 'An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConvexProvider client={convex}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Top Section */}
        <View
          style={{
            paddingHorizontal: 20,
            backgroundColor: '#fff',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Image
              source={typeof logoUri === 'string' ? { uri: logoUri } : logoUri}
              style={{ width: '100%', height: 200 }}
            />
          </View>
        </View>

        {/* Bottom Section - Keep existing styles and logic */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#1d2939',
            borderTopLeftRadius: 50,
            borderTopRightRadius: 50,
            padding: 20,
            paddingTop: 40,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            Cellphone number
          </Text>

          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="Cellphone number"
            placeholderTextColor="#999"
            style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 20,
              fontSize: 16,
            }}
          />

          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            Password
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 12,
              height: 44,
              marginBottom: 15,
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              style={{
                flex: 1,
                fontSize: 16,
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: '#ccc', fontSize: 16 }}>Forgot Password?</Text>
          </TouchableOpacity>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={{
              height: 50,
              backgroundColor: isLoading ? '#ccc' : '#f90',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 30,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>

          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>Or</Text>
          </View>

          <Pressable
            style={{
              width: 45,
              height: 45,
              borderRadius: 10,
              alignSelf: 'center',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={typeof googleIconUri === 'string' ? { uri: googleIconUri } : googleIconUri}
              style={{ width: 24, height: 24 }}
            />
          </Pressable>
        </View>
      </View>
    </ConvexProvider>
  );
}