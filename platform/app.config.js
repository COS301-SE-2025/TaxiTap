export default {
  expo: {
    name: "TaxiTap",
    slug: "TaxiTap",
    version: "1.0.0",
    sdkVersion: "54.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
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
      eas: {
        projectId: "880ada88-b612-4c2f-b902-1790c99551c0"
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gititdone.taxitap",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY || "AIzaSyAZyWdfPWLscdCqG7ur4USKKDcn7b8hxYg"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.gititdone.taxitap",
      config: {
        googleMaps: {
          // NOTE: Hardcoded due to EAS build environment variable issues
          apiKey: "AIzaSyAy5V8wsxjiKrK-Qv9Zt_stGvHwRSGmLBA"
        }
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon.png",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "This app uses location to find nearby taxis and provide directions."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
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