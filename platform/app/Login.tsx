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
  const { currentLanguage } = useLanguage();
  const { showGlobalError } = useAlertHelpers();

  // Hardcoded translations
  const translations = {
    en: {
      error: "Error",
      pleaseFillAllFields: "Please fill all fields",
      invalidNumber: "Invalid number format",
      loginError: "Login Error",
      alreadyLoggedIn: "You are already logged in on another device. Please log out first.",
      incorrectCredentials: "Phone number or password incorrect",
      unexpectedError: "An unexpected error occurred",
      phoneNumber: "Phone Number",
      password: "Password",
      enterPassword: "Enter your password",
      forgotPassword: "Forgot Password?",
      login: "Login"
    },
    tn: {
      error: "Phoso",
      pleaseFillAllFields: "Ka kopo tlatlhele mafelo otlhe",
      invalidNumber: "Foromo ya nomoro e e sa siamang",
      loginError: "Phoso ya Go Tsena",
      alreadyLoggedIn: "O tsene ka tsela e nngwe. Ka kopo tswa pele.",
      incorrectCredentials: "Nomoro ya tsela kgotsa phetogo e e sa siamang",
      unexpectedError: "Phoso e e sa lebelelwang e dirile",
      phoneNumber: "Nomoro ya Tsela",
      password: "Phetogo",
      enterPassword: "Tsenya phetogo ya gago",
      forgotPassword: "O Lebalegile Phetogo?",
      login: "Kena"
    },
    zu: {
      error: "Iphutha",
      pleaseFillAllFields: "Sicela ugcwalise wonke amasimu",
      invalidNumber: "Ifomethi yenombolo engalungile",
      loginError: "Iphutha Lokungena",
      alreadyLoggedIn: "Usungene kwesinye isisetshenziswa. Sicela uphume kuqala.",
      incorrectCredentials: "Inombolo yefoni noma iphasiwedi engalungile",
      unexpectedError: "Kwenzeke iphutha elingalindelekile",
      phoneNumber: "Inombolo Yefoni",
      password: "Iphasiwedi",
      enterPassword: "Faka iphasiwedi yakho",
      forgotPassword: "Ukhohlwe Iphasiwedi?",
      login: "Ngena"
    },
    af: {
      error: "Fout",
      pleaseFillAllFields: "Vul asseblief alle velde in",
      invalidNumber: "Ongeldige nommerformaat",
      loginError: "Inteken Fout",
      alreadyLoggedIn: "Jy is reeds ingeteken op 'n ander toestel. Teken asseblief eers uit.",
      incorrectCredentials: "Telefoonnommer of wagwoord verkeerd",
      unexpectedError: "'n Onverwagte fout het voorgekom",
      phoneNumber: "Telefoonnommer",
      password: "Wagwoord",
      enterPassword: "Voer jou wagwoord in",
      forgotPassword: "Wagwoord Vergeet?",
      login: "Teken In"
    }
  };
  
  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };

  const handleLogin = async () => {
    const deviceId = await getDeviceId();

    if (!number || !password) {
      showGlobalError(t('error'), t('pleaseFillAllFields'), {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    const saNumberRegex = /^(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      showGlobalError(t('error'), t('invalidNumber'), {
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
          showGlobalError(t('loginError'), t('alreadyLoggedIn'), {
            duration: 5000,
            position: 'top',
            animation: 'slide-down',
          });
        } else {
          showGlobalError(t('loginError'), t('incorrectCredentials'), {
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
      showGlobalError(t('error'), t('unexpectedError'), {
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
              {t('phoneNumber')}
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
              {t('password')}
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
              placeholder={t('enterPassword')}
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
              {t('login')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ConvexProvider>
  );
}