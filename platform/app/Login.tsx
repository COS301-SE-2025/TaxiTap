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

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    phoneNumber: {
      en: "Phone Number",
      zu: "Inombolo Yocingo",
      tn: "Nomoro ya Tshepe",
      af: "Telefoonnommer"
    },
    password: {
      en: "Password",
      zu: "Iphasiwedi",
      tn: "Leleme la sephiri",
      af: "Wagwoord"
    },
    forgotPassword: {
      en: "Forgot Password?",
      zu: "Ukhohlwe Iphasiwedi?",
      tn: "O lebetse Leleme la sephiri?",
      af: "Wagwoord vergeet?"
    },
    login: {
      en: "Login",
      zu: "Ngena",
      tn: "Tsena",
      af: "Teken In"
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
    invalidNumberFormat: {
      en: "Invalid number format",
      zu: "Ifomethi yenombolo engavumelekile",
      tn: "Mokgwa wa nomoro o o sa siamang",
      af: "Ongeldige nommerformaat"
    },
    loginError: {
      en: "Login Error",
      zu: "Iphutha Lokungena",
      tn: "Phoso ya go Tsena",
      af: "Aanmeldingsfout"
    },
    alreadyLoggedIn: {
      en: "You are already logged in on another device. Please log out first.",
      zu: "Usuvele ungene kwesinye isisetshenziswa. Sicela uphume kuqala.",
      tn: "O setse o tsene mo sediriseng se sengwe. Ka kopo, tswa pele.",
      af: "Jy is reeds aangemeld op 'n ander toestel. Meld asseblief eers uit."
    },
    phoneOrPasswordIncorrect: {
      en: "Phone number or password incorrect",
      zu: "Inombolo yocingo noma iphasiwedi ayilungile",
      tn: "Nomoro ya tshepe kgotsa leleme la sephiri ga le siame",
      af: "Telefoonnommer of wagwoord verkeerd"
    },
    unexpectedError: {
      en: "An unexpected error occurred",
      zu: "Kwenzeke iphutha elingalindelekile",
      tn: "Phoso e e sa lebeletseng e tlhagile",
      af: "'n Onverwagte fout het voorgekom"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const handleLogin = async () => {
    const deviceId = await getDeviceId();

    if (!number || !password) {
      showGlobalError(getTranslation('error'), getTranslation('pleaseFillAllFields'), {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    const saNumberRegex = /^(6|7|8)[0-9]{8}$/;
    if (!saNumberRegex.test(number)) {
      showGlobalError(getTranslation('error'), getTranslation('invalidNumberFormat'), {
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
          showGlobalError(getTranslation('loginError'), getTranslation('alreadyLoggedIn'), {
            duration: 5000,
            position: 'top',
            animation: 'slide-down',
          });
        } else {
          showGlobalError(getTranslation('loginError'), getTranslation('phoneOrPasswordIncorrect'), {
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
    } catch (error) {
      showGlobalError(getTranslation('error'), getTranslation('unexpectedError'), {
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

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: '#ccc', fontSize: 16 }}>{getTranslation('forgotPassword')}</Text>
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
              marginBottom: 25,
            }}
          >
            <Text style={{ color: '#232f3e', fontWeight: '700', fontSize: 26 }}>
              {getTranslation('login')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ConvexProvider>
  );
}