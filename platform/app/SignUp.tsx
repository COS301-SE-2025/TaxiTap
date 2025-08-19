import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
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
import { useAlertHelpers } from '../components/AlertHelpers';
import { useUser } from '../contexts/UserContext';

const convex = new ConvexReactClient("https://affable-goose-538.convex.cloud");

function SignUpComponent() {
  const signUpWithSMS = useMutation(api.functions.users.UserManagement.signUpWithSMS.signUpSMS);
  const { t, currentLanguage } = useLanguage();
  const [nameSurname, setNameSurname] = useState('');
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const [localNumber, setLocalNumber] = useState('');
  const { login } = useUser();

  // Dynamic role data based on current language
  const getRoleData = () => {
    switch(currentLanguage) {
      case 'zu':
        return [
          { label: 'Umgibeli', value: 'passenger' },
          { label: 'Umshayeli', value: 'driver' },
        ];
      case 'tn':
        return [
          { label: 'Mopalami', value: 'passenger' },
          { label: 'Mokgweetsi', value: 'driver' },
        ];
      case 'af':
        return [
          { label: 'Passasier', value: 'passenger' },
          { label: 'Bestuurder', value: 'driver' },
        ];
      default:
        return [
          { label: 'Passenger', value: 'passenger' },
          { label: 'Driver', value: 'driver' },
        ];
    }
  };
  const { showGlobalError } = useAlertHelpers();

  const handleSignup = async () => {
    if (!localNumber || !password || !nameSurname || !confirmPassword) {
      showGlobalError(t('common:error'), t('common:pleaseFillAllFields'), { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    if (!selectedRole) {
      showGlobalError(t('common:error'), t('common:pleaseSelectRole'), { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    const saNumberRegex = /^(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(localNumber)) {
      showGlobalError(t('common:error'), t('common:invalidNumber'), { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    if (password !== confirmPassword) {
      showGlobalError(t('common:error'), t('common:passwordMismatch'), { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    try {
      const accountType: 'passenger' | 'driver' | 'both' = selectedRole === 'driver' ? 'both' : selectedRole;
      const fullNumber = '0' + localNumber;

      const result = await signUpWithSMS({ phoneNumber: fullNumber, name: nameSurname, password, accountType });
      await AsyncStorage.setItem('userId', result.userId);

      const userObject = {
        id: result.userId,
        name: nameSurname,
        phoneNumber: fullNumber,
        currentActiveRole: selectedRole,
        accountType: accountType
      };

      await login(userObject);

      if (selectedRole === 'driver') {
        router.push({ pathname: '/DriverOffline', params: { userId: result.userId } });
      } else if (selectedRole === 'passenger') {
        router.push({ pathname: '/HomeScreen', params: { userId: result.userId } });
      }
    } catch (err: any) {
      const message = (err?.data?.message) || (err?.message) || "Something went wrong";
      if (message.includes('Phone number already exists')) {
        showGlobalError('Phone Number In Use', 'This phone number is already registered. Try logging in or use a different number.', { duration: 5000, position: 'top', animation: 'slide-down' });
      } else {
        console.log('Signup Error', message);
      }
    }
  };

  const currentRoleData = getRoleData();

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
          <View style={{ alignItems: 'center', marginTop: 60 }}>
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
              value={localNumber}
              onChangeText={setLocalNumber}
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
              marginBottom: 25,
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {t('auth:signUp')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export default function SignUp() {
  return (
    <ConvexProvider client={convex}>
      <SignUpComponent />
    </ConvexProvider>
  );
}