import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
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
import { useLanguage } from '../contexts/LanguageContext';
import icon from '../assets/images/icon.png';
import { useAlertHelpers } from '../components/AlertHelpers';
import { getDeviceId } from '../contexts/UserContext';

export default function Login() {
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const convex = useConvex();
  const { login } = useUser();
  const { t, currentLanguage } = useLanguage();
  const { showGlobalError } = useAlertHelpers();

  const handleLogin = async () => {
    const deviceId = await getDeviceId();

    if (!number || !password) {
      showGlobalError('Error', 'Please fill all fields', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    const saNumberRegex = /^(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      showGlobalError('Error', 'Invalid number format', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    try {
      const fullNumber = '0' + number;
      const result = await convex.mutation(
        api.functions.users.UserManagement.logInWithSMS.loginSMS,
        { phoneNumber: fullNumber, password, deviceId }
      );

      if (!result.success) {
        if (result.reason === "Already logged in on another device") {
          showGlobalError('Login Error', 'You are already logged in on another device. Please log out first.', {
            duration: 5000,
            position: 'top',
            animation: 'slide-down',
          });
        } else {
          showGlobalError('Login Error', 'Phone number or password incorrect', {
            duration: 4000,
            position: 'top',
            animation: 'slide-down',
          });
        }
        return;
      }

      await login(result.user);

      if (result.user.currentActiveRole === 'driver') {
        router.push({
          pathname: '/DriverOffline',
          params: { userId: result.user.id.toString() },
        });
      } else if (result.user.currentActiveRole === 'passenger') {
        router.push({
          pathname: '/HomeScreen',
          params: { userId: result.user.id.toString() },
        });
      }
    } catch (err) {
      showGlobalError('Error', 'An unexpected error occurred', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
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
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Image
              source={icon}
              style={{ width: '100%', height: 200 }}
            />
          </View>
        </View>

        {/* Bottom Section */}
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
          {/* Username */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
              {t('auth:phoneNumber')}
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 15 }}>
            {/* Country code */}
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 10,
                paddingHorizontal: 12,
                justifyContent: 'center',
                marginRight: 10,
                width: 80,
              }}
            >
              <Text style={{ fontSize: 16 }}>+27</Text>
            </View>

            {/* Local number */}
            <TextInput
              value={number}
              onChangeText={setNumber}
              placeholder="000000000"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              style={{
                flex: 1,
                backgroundColor: '#fff',
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 16,
              }}
            />
          </View>

          {/* Password */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
              {t('auth:password')}
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
              placeholder={t('auth:password')}
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


          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            style={{
              height: 50,
              backgroundColor: '#f90',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 30,
              marginBottom: 25,
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {t('auth:login')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ConvexProvider>
  );
}