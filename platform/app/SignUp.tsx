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

const convex = new ConvexReactClient("https://affable-goose-538.convex.cloud");

const data = [
  { label: 'Passenger', value: 'passenger' },
  { label: 'Driver', value: 'driver' },
];

function LoginComponent() {
  // Move useMutation inside the component that's wrapped by ConvexProvider
  const signUpWithSMS = useMutation(api.functions.users.UserManagement.signUpWithSMS.signUpSMS);
  
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
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }
    const saNumberRegex = /^0(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      Alert.alert('Invalid number', 'Please enter a valid number');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
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
        Alert.alert("Phone Number In Use", "This phone number is already registered. Try logging in or use a different number.");
      } else {
        console.log("Signup Error", message);
      }
    }
  };

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
            Name and Surname
          </Text>

          <TextInput
            value={nameSurname}
            onChangeText={setNameSurname}
            placeholder="Name and Surname"
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
            Cellphone number
          </Text>

          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="Cellphone number"
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
            Select Role
          </Text>

          <Dropdown
            data={data}
            labelField="label"
            valueField="value"
            placeholder="Select role"
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

          {/* Confirm Password */}
          <Text style={{ color: 'white', fontWeight: '400', fontSize: 20, paddingLeft: 4, paddingBottom: 6 }}>
            Confirm Password
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
              placeholder="Confirm Password"
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
              Sign Up
            </Text>
          </Pressable>

          {/* Or Divider */}
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>Or</Text>
          </View>

          {/* Google Sign-In Button */}
          <Pressable
            style={{
              backgroundColor: '#f90',
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