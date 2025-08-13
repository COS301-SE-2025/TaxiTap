import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Dropdown } from 'react-native-element-dropdown';
import { api } from "../convex/_generated/api";
import { useMutation } from 'convex/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';

const convex = new ConvexReactClient("https://affable-goose-538.convex.cloud");

const roleData = [
  { label: 'Passenger', value: 'passenger' },
  { label: 'Driver', value: 'driver' },
];

const roleDataZulu = [
  { label: 'Umgibeli', value: 'passenger' },
  { label: 'Umshayeli', value: 'driver' },
];

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'isiZulu', value: 'zu' },
];

function LoginComponent() {
  // Move useMutation inside the component that's wrapped by ConvexProvider
  const signUpWithSMS = useMutation(api.functions.users.UserManagement.signUpWithSMS.signUpSMS);
  const { t, currentLanguage, changeLanguage } = useLanguage();
  
  const [nameSurname, setNameSurname] = useState('');
  const [number, setNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!number || !password || !nameSurname || !confirmPassword) {
      Alert.alert(t('common:error'), t('common:pleaseFillAllFields'));
      return;
    }
    if (!selectedRole) {
      Alert.alert(t('common:error'), t('common:pleaseSelectRole'));
      return;
    }
    const saNumberRegex = /^0(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      Alert.alert(t('common:error'), t('common:invalidNumber'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common:error'), t('common:passwordMismatch'));
      return;
    }

    try {
      const accountType: 'passenger' | 'driver' | 'both' = selectedRole === 'driver' ? 'both' : selectedRole;

      const result = await signUpWithSMS({
        phoneNumber: number,
        name: nameSurname,
        password,
        accountType: accountType,
      });

      // Store userId in AsyncStorage
      await AsyncStorage.setItem('userId', result.userId);
      const userId = await AsyncStorage.getItem('userId');
      if (selectedRole === 'driver') {
        router.push({
          pathname: '/DriverOffline',
          params: { userId: result.userId }
        });
      } else if (selectedRole === 'passenger') {
        router.push({
          pathname: '/HomeScreen',
          params: { userId: result.userId }
        });
      }
    } catch (err: any) {
      const message = (err?.data?.message) || (err?.message) || "Something went wrong";
      if (message.includes("Phone number already exists")) {
        Alert.alert(t('common:error'), t('common:phoneNumberInUse'));
      } else {
        console.log("Signup Error", message);
      }
    }
  };

  const currentRoleData = currentLanguage === 'zu' ? roleDataZulu : roleData;

  return (
    <ScrollView>
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
              source={require('../assets/images/icon.png')}
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
          {/* Name and surname */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            {t('auth:nameAndSurname')}
          </Text>

          <TextInput
            value={nameSurname}
            onChangeText={setNameSurname}
            placeholder={t('auth:nameAndSurname')}
            placeholderTextColor="#999"
            style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 15,
              fontSize: 16,
            }}
          />

          {/* Phone Number */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            {t('auth:phoneNumber')}
          </Text>

          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder={t('auth:phoneNumber')}
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 15,
              fontSize: 16,
            }}
          />

          {/* Dropdown for Role */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            {t('auth:selectRole')}
          </Text>

          <Dropdown
            data={currentRoleData}
            labelField="label"
            valueField="value"
            placeholder={t('auth:selectRole')}
            placeholderStyle={{ color: '#999' }}
            style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 15,
            }}
            selectedTextStyle={{ fontSize: 16, color: '#000' }}
            value={selectedRole}
            onChange={(item: { label: string; value: 'passenger' | 'driver' }) => setSelectedRole(item.value)}
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

          {/* Confirm Password */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            {t('auth:confirmPassword')}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingHorizontal: 12,
              height: 44,
              marginBottom: 20,
            }}
          >
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth:confirmPassword')}
              placeholderTextColor="#999"
              secureTextEntry={!showConfirmPassword}
              style={{
                flex: 1,
                fontSize: 16,
              }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* SignUp Button */}
          <Pressable
            onPress={handleSignup}
            style={{
              height: 50,
              backgroundColor: '#f90',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {t('auth:signUp')}
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
              source={require('../assets/images/google5.png')}
              style={{ width: 24, height: 24 }}
            />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// Wrap the component with ConvexProvider
export default function Login() {
  return (
    <ConvexProvider client={convex}>
      <LoginComponent />
    </ConvexProvider>
  );
}