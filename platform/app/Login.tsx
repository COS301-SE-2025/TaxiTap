import React, { useState } from 'react';
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
import { useLanguage } from '../contexts/LanguageContext';
import { Dropdown } from 'react-native-element-dropdown';
import icon from '../assets/images/icon.png';
import google from '../assets/images/google5.png';

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'isiZulu', value: 'zu' },
];

export default function Login() {
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const convex = useConvex();
  const { login } = useUser();
  const { t, currentLanguage, changeLanguage } = useLanguage();

  const handleLogin = async () => {
    if (!number || !password) {
      Alert.alert(t('common:error'), t('common:pleaseFillAllFields'));
      return;
    }
    const saNumberRegex = /^0(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      Alert.alert(t('common:error'), t('common:invalidNumber'));
      return;
    }
    try {
      const result = await convex.query(api.functions.users.UserManagement.logInWithSMS.loginSMS, {
        phoneNumber: number,
        password,
      });

      // Use the context login function
      await login(result);
      
      if (result.currentActiveRole === 'driver') {
        router.push({
        pathname: '/DriverOffline',
        params: { userId: result.id.toString() }
      });
      } else if (result.currentActiveRole === 'passenger') {
        router.push({
        pathname: '/HomeScreen',
        params: { userId: result.id.toString() }
      });
      }
    } catch {
      Alert.alert(t('common:error'), t('common:phoneNumberOrPasswordIncorrect'));
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
          {/* Language Selector */}
          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <Dropdown
              data={languageOptions}
              labelField="label"
              valueField="value"
              placeholder="Select Language"
              placeholderStyle={{ color: '#999' }}
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderColor: '#ddd',
                borderWidth: 1,
              }}
              selectedTextStyle={{ fontSize: 16, color: '#000' }}
              value={currentLanguage}
              onChange={(item) => changeLanguage(item.value)}
            />
          </View>

          <View style={{ alignItems: 'center' }}>
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

          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder={t('auth:phoneNumber')}
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

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: '#ccc', fontSize: 16 }}>{t('auth:forgotPassword')}</Text>
          </TouchableOpacity>

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
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {t('auth:login')}
            </Text>
          </Pressable>

          {/* Or Divider */}
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>
              {currentLanguage === 'zu' ? 'Noma' : 'Or'}
            </Text>
          </View>

          {/* Google Sign-In Button */}
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
              source={google}
              style={{ width: 24, height: 24 }}
            />
          </Pressable>
        </View>
      </View>
    </ConvexProvider>
  );
}