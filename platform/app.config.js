export default {
  expo: {
    name: "TaxiTap",
    slug: "TaxiTap",
    version: "1.0.0",
    sdkVersion: "54.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon-dark.png",
    scheme: "frontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    // Add extra field for easier access to environment variables
    extra: {
      googleMapsIosApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
      googleMapsAndroidApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
      eas: {
        projectId: "880ada88-b612-4c2f-b902-1790c99551c0"
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gititdone.taxitap",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-dark.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.gititdone.taxitap",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
        }
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon-dark.png",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon-dark.png",
          "color": "#ffffff",
          "sounds": ["../assets/audios/hoot.wav"],
          "projectId": "TaxiTap"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
};