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
import * as Device from 'expo-device';

const deviceId = Device.osInternalBuildId || Device.osBuildId || 'unknown-device';

const convex = new ConvexReactClient("https://affable-goose-538.convex.cloud");

function SignUpComponent() {
  const signUpWithSMS = useMutation(api.functions.users.UserManagement.signUpWithSMS.signUpSMS);
  const { currentLanguage } = useLanguage();
  const [nameSurname, setNameSurname] = useState('');
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const [localNumber, setLocalNumber] = useState('');
  const { login } = useUser();

  // Hardcoded translations for all UI text
  const translations = {
    nameAndSurname: {
      en: "Name and Surname",
      zu: "Igama Nesibongo",
      tn: "Leina le Motsadi",
      af: "Naam en Van"
    },
    phoneNumber: {
      en: "Phone Number",
      zu: "Inombolo Yocingo",
      tn: "Nomoro ya Tshepe",
      af: "Telefoonnommer"
    },
    selectRole: {
      en: "Select Role",
      zu: "Khetha Indima",
      tn: "Tlhopha Seemo",
      af: "Kies Rol"
    },
    password: {
      en: "Password",
      zu: "Iphasiwedi",
      tn: "Leleme la sephiri",
      af: "Wagwoord"
    },
    confirmPassword: {
      en: "Confirm Password",
      zu: "Qinisekisa Iphasiwedi",
      tn: "Tlatsa Leleme la sephiri",
      af: "Bevestig Wagwoord"
    },
    signUp: {
      en: "Sign Up",
      zu: "Bhalisa",
      tn: "Ikwadise",
      af: "Registreer"
    },
    error: {
      en: "Error",
      zu: "Iphutha",
      tn: "Phoso",
      af: "Fout"
    },
    pleaseFillAllFields: {
      en: "Please fill all fields",
      zu: "Sicela ugcwalise zonke izinkambu",
      tn: "Ka kopo, tlatsa mafelo otlhe",
      af: "Vul asseblief alle velde in"
    },
    pleaseSelectRole: {
      en: "Please select a role",
      zu: "Sicela ukhethe indima",
      tn: "Ka kopo, tlopha seemo",
      af: "Kies asseblief 'n rol"
    },
    invalidNumber: {
      en: "Invalid number format",
      zu: "Ifomethi yenombolo engavumelekile",
      tn: "Mokgwa wa nomoro o o sa siamang",
      af: "Ongeldige nommerformaat"
    },
    passwordMismatch: {
      en: "Passwords do not match",
      zu: "Amaphasiwedi awahambelani",
      tn: "Maleme a sephiri ga a tshwane",
      af: "Wagwoorde stem nie ooreen nie"
    },
    phoneNumberInUse: {
      en: "Phone Number In Use",
      zu: "Inombolo Yocingo Isasetshenziswa",
      tn: "Nomoro ya Tshepe e dirisiwa",
      af: "Telefoonnommer In Gebruik"
    },
    phoneAlreadyRegistered: {
      en: "This phone number is already registered. Try logging in or use a different number.",
      zu: "Leyi inombolo yocingo isivele ibhalisiwe. Zama ukungena noma usebenzise enye inombolo.",
      tn: "Nomoro ya tshepe e e e leng teng e setse e kwadilwe. Lekanya go tsena kgotsa dirisa nomoro e nngwe.",
      af: "Hierdie telefoonnommer is reeds geregistreer. Probeer aan te meld of gebruik 'n ander nommer."
    },
    signupFailed: {
      en: "Signup failed. Please try again.",
      zu: "Ukubhalisa kuhlulekile. Sicela uzame futhi.",
      tn: "Go ikwadisa ga ga atlega. Ka kopo, leka gape.",
      af: "Registrasie het misluk. Probeer asseblief weer."
    }
  } as const;

  // Type-safe translation getter
  type Language = 'en' | 'zu' | 'tn' | 'af';

  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as Language];
  };

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
      showGlobalError(
        getTranslation('error'),
        getTranslation('pleaseFillAllFields'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
      return;
    }

    if (!selectedRole) {
      showGlobalError(
        getTranslation('error'),
        getTranslation('pleaseSelectRole'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
      return;
    }

    const saNumberRegex = /^(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(localNumber)) {
      showGlobalError(
        getTranslation('error'),
        getTranslation('invalidNumber'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
      return;
    }

    if (password !== confirmPassword) {
      showGlobalError(
        getTranslation('error'),
        getTranslation('passwordMismatch'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
      return;
    }

    const accountType: 'passenger' | 'driver' | 'both' = selectedRole === 'driver' ? 'both' : selectedRole;
    const fullNumber = '0' + localNumber;

    const result = await signUpWithSMS({
      phoneNumber: fullNumber,
      name: nameSurname,
      password,
      accountType,
      deviceId
    });

    if (!result.success) {
      if (result.reason === "Phone number already exists") {
        showGlobalError(
          getTranslation('phoneNumberInUse'),
          getTranslation('phoneAlreadyRegistered'),
          { duration: 5000, position: 'top', animation: 'slide-down' }
        );
      } else {
        showGlobalError(
          getTranslation('error'),
          result.reason || getTranslation('signupFailed'),
          { duration: 4000, position: 'top', animation: 'slide-down' }
        );
      }
      return;
    }

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
            {getTranslation('nameAndSurname')}
          </Text>

          <TextInput
            value={nameSurname}
            onChangeText={setNameSurname}
            placeholder={getTranslation('nameAndSurname')}
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
            {getTranslation('phoneNumber')}
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
            {getTranslation('selectRole')}
          </Text>

          <Dropdown
            data={currentRoleData}
            labelField="label"
            valueField="value"
            placeholder={getTranslation('selectRole')}
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
            {getTranslation('password')}
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
              placeholder={getTranslation('password')}
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
            {getTranslation('confirmPassword')}
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
              placeholder={getTranslation('confirmPassword')}
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
              {getTranslation('signUp')}
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