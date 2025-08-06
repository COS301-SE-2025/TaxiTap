import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const englishTranslations = {
  // Authentication & Onboarding
  auth: {
    welcome: "Welcome to Taxi Tap",
    login: "Login",
    signup: "Sign Up",
    phoneNumber: "Phone Number",
    password: "Password",
    forgotPassword: "Forgot Password?",
    createAccount: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    nameAndSurname: "Name and Surname",
    selectRole: "Select Role",
    confirmPassword: "Confirm Password",
    signUp: "Sign Up",
    or: "Or",
  },

  // Landing page content
  landing: {
    skipThe: "Skip the ",
    wait: "Wait",
    reserveA: ", \nReserve a ",
    seat: "Seat",
    description: "Taxi Tap connects passengers and drivers. Passengers reserve seats, share destinations, and track arrivals, while drivers set routes, manage availability, and handle ride requests.",
    letsGetStarted: "Let's get started",
    alreadyHaveAccount: "Already have an account? ",
    signIn: "Sign in",
  },

  // Common UI elements
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    retry: "Retry",
    back: "Back",
    next: "Next",
    done: "Done",
    yes: "Yes",
    no: "No",
    search: "Search",
    filter: "Filter",
    pleaseFillAllFields: "Please fill all fields",
    pleaseSelectRole: "Please select a role",
    invalidNumber: "Please enter a valid number",
    passwordMismatch: "Passwords do not match",
    phoneNumberInUse: "This phone number is already registered. Try logging in or use a different number.",
    phoneNumberOrPasswordIncorrect: "Phone number or password is incorrect",
    ok: "OK",
  },

  // HomeScreen translations
  home: {
    gettingLocation: "Getting your location...",
    enterOriginAddress: "Enter origin address...",
    enterDestinationAddress: "Enter destination address...",
    findingAddress: "Finding address...",
    gettingCurrentLocation: "Getting current location...",
    loadingRoute: "Loading route...",
    routeLoaded: "Route loaded ✓",
    searchingTaxis: "Searching for available taxis...",
    findingTaxis: "Finding Taxis...",
    searchingDrivers: "Searching for available drivers...",
    journeyStatus: "Journey Status",
    availableTaxis: "Available taxis:",
    matchingRoutes: "Matching routes:",
    readyToBook: "✅ Ready to book your ride!",
    noTaxisAvailable: "⚠ No taxis available on this route",
    recentlyUsedRanks: "Recently Used Taxi Ranks",
    noRecentRoutes: "No recently used routes yet.",
    reserveSeat: "Reserve a Seat",
    reserveSeatWithCount: "Reserve a Seat ({count} taxis available)",
    usedTimes: "Used {count} times",
    permissionDenied: "Permission denied",
    locationPermissionRequired: "Location permission is required to find nearby taxis.",
    locationError: "Location Error",
    unableToGetLocation: "Unable to get your current location. Please enter your address manually.",
    googleMapsNotConfigured: "Google Maps API key is not configured",
    addressNotFound: "Could not find the address. Please try again.",
    routeError: "Route Error",
    searchError: "Search Error",
    unableToFindTaxis: "Unable to find available taxis. Please try again.",
    noTaxisAvailableAlert: "No Taxis Available",
    noTaxisAvailableMessage: "No taxis are currently available on routes that connect your origin and destination. Please try a different route or check again later.",
    pleaseEnterAddresses: "Please enter both origin and destination addresses",
    routeNotSelected: "Route not selected",
    unknownError: "Unknown error",
    locationStreamingError: "Location Streaming Error:",
    liveLocationStreaming: "Live Location Streaming:",
    streamingLocation: "Streaming location...",
  },

  // Booking flow
  booking: {
    selectRoute: "Select Route",
    availableSeats: "Available Seats",
    reserveSeat: "Reserve Seat",
    bookingConfirmed: "Booking Confirmed",
    myBookings: "My Bookings",
    paymentMethod: "Payment Method",
    totalAmount: "Total Amount",
    pickupTime: "Pickup Time",
    destination: "Destination",
    origin: "Origin",
  },

  // Navigation & Tabs
  navigation: {
    home: "Home",
    bookings: "Bookings",
    profile: "Profile",
    settings: "Settings",
    history: "History",
    wallet: "Wallet",
    routes: "Routes",
    feedback: "Feedback",
    help: "Help",
  },

  // Settings
  settings: {
    language: "Language",
    theme: "Theme",
    notifications: "Notifications",
    support: "Support",
    aboutApp: "About App",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    logout: "Logout",
  },

  // Notifications
  notifications: {
    rideDeclined: "Ride Declined",
    rideAccepted: "Ride Accepted",
    rideCancelled: "Ride Cancelled",
    rideDeclinedMessage: "Your ride request was declined.",
    ok: "OK",
  },
};

// Zulu translations
const zuluTranslations = {
  // Authentication & Onboarding
  auth: {
    welcome: "Siyakwamukela ku-Taxi Tap",
    login: "Ngena",
    signup: "Bhalisa",
    phoneNumber: "Inombolo Yefoni",
    password: "Iphasiwedi",
    forgotPassword: "Ukhohlwe Iphasiwedi?",
    createAccount: "Dala I-akhawunti",
    alreadyHaveAccount: "Usenayo i-akhawunti?",
    dontHaveAccount: "Awunayo i-akhawunti?",
    nameAndSurname: "Igama Nefani",
    selectRole: "Khetha Indima",
    confirmPassword: "Qinisekisa Iphasiwedi",
    signUp: "Bhalisa",
    or: "Noma",
  },

  // Landing page content
  landing: {
    skipThe: "Yeqa uku",
    wait: "linda",
    reserveA: ", \nbuka i",
    seat: "sihlalo",
    description: "I-Taxi Tap ixhumanisa abagibeli nabashayeli. Abagibeli babuka izihlalo, babelane ngezindawo, futhi balandele ukufika, kanti abashayeli babeka imizila, baphatha ukutholakala, futhi baphathe izicelo zokugibela.",
    letsGetStarted: "Ake siqale",
    alreadyHaveAccount: "Usunalo i-akhawunti? ",
    signIn: "Ngena",
  },

  // Common UI elements
  common: {
    cancel: "Khansela",
    confirm: "Qinisekisa",
    save: "Londoloza",
    loading: "Iyalayisha...",
    error: "Iphutha",
    success: "Impumelelo",
    retry: "Zama Futhi",
    back: "Emuva",
    next: "Olandelayo",
    done: "Kwenziwe",
    yes: "Yebo",
    no: "Cha",
    search: "Sesha",
    filter: "Hlunga",
    pleaseFillAllFields: "Sicela ugcwalise wonke amasimu",
    pleaseSelectRole: "Sicela ukhethe indima",
    invalidNumber: "Sicela ufake inombolo elungile",
    passwordMismatch: "Amaphasiwedi awafani",
    phoneNumberInUse: "Le nombolo yefoni ibhalisiwe kakade. Zama ukungena noma usebenzise enye inombolo.",
    phoneNumberOrPasswordIncorrect: "Inombolo yefoni noma iphasiwedi ayilungile",
  },

  // Booking flow
  booking: {
    selectRoute: "Khetha Indlela",
    availableSeats: "Izihlalo Ezitholakalayo",
    reserveSeat: "Beka Isihlalo",
    bookingConfirmed: "Ukubhukha Kuqinisekisiwe",
    myBookings: "Izibhukho Zami",
    paymentMethod: "Indlela Yokukhokha",
    totalAmount: "Isamba Soholo",
    pickupTime: "Isikhathi Sokuthatha",
    destination: "Indawo Yokugcina",
    origin: "Indawo Yokuqala",
  },

  // Navigation & Tabs
  navigation: {
    home: "Ikhaya",
    bookings: "Izibhukho",
    profile: "Iphrofayili",
    settings: "Izilungiselelo",
    history: "Umlando",
    wallet: "Iwalethi",
    routes: "Izindlela",
    feedback: "Impendulo",
    help: "Usizo",
  },

  // Settings
  settings: {
    language: "Ulimi",
    theme: "Itimu",
    notifications: "Izaziso",
    support: "Ukusekela",
    aboutApp: "Mayelana Ne-App",
    privacyPolicy: "Inqubomgomo Yobumfihlo",
    termsOfService: "Imigomo Yesevisi",
    logout: "Phuma",
  },

  // Notifications
  notifications: {
    rideDeclined: "Ukuya Kwenqatshelwe",
    rideAccepted: "Ukuya Kwamukelwe",
    rideCancelled: "Ukuya Kukhanselwe",
    rideDeclinedMessage: "Isicelo sakho sokuya senqatshelwe.",
    ok: "Kulungile",
  },
};

// Tswana translations
const tswanaTranslations = {
  // Authentication & Onboarding
  auth: {
    welcome: "Re amogela mo go Taxi Tap",
    login: "Tsena",
    signup: "Ikwadise",
    phoneNumber: "Nomoro ya Mogala",
    password: "Lefoko la sephiri",
    forgotPassword: "O lebetse lefoko la sephiri?",
    createAccount: "Dira akhaonte",
    alreadyHaveAccount: "O nale akhaonte?",
    dontHaveAccount: "Ga o na le akhaonte?",
    nameAndSurname: "Leina le Sefane",
    selectRole: "Tlhopha seabe",
    confirmPassword: "Netefatsa lefoko la sephiri",
    signUp: "Ikwadise",
    or: "Kgotsa",
  },

  // Landing page content
  landing: {
    skipThe: "Tlola ",
    wait: "go leta",
    reserveA: ", \nbea ",
    seat: "setulo",
    description: "Taxi Tap e kopanya bapalami le bakgweetsi. Bapalami ba bea ditulo, ba abelana mafelo a ba yang teng, le go sala morago phitlhelo, fa bakgweetsi ba bea ditsela, ba laola go nna teng, le go tshwara dikopo tsa dinamelwa.",
    letsGetStarted: "A re simolole",
    alreadyHaveAccount: "O nale akhaonte? ",
    signIn: "Tsena",
  },

  // Common UI elements
  common: {
    cancel: "Khansela",
    confirm: "Netefatsa",
    save: "Boloka",
    loading: "E a tsaya...",
    error: "Phoso",
    success: "Katlego",
    retry: "Leka gape",
    back: "Morago",
    next: "Latelang",
    done: "Dirile",
    yes: "Ee",
    no: "Nnyaa",
    search: "Batla",
    filter: "Kgaoganya",
    pleaseFillAllFields: "Tshwanetse o tlatse mafelo otlhe",
    pleaseSelectRole: "Tshwanetse o tlhophe seabe",
    invalidNumber: "Tshwanetse o tsenya nomoro e e siameng",
    passwordMismatch: "Mafoko a sephiri ga a tshwane",
    phoneNumberInUse: "Nomoro eno ya mogala e setse e ngodisitswe. Leka go tsena kgotsa dirisa nomoro e nngwe.",
    phoneNumberOrPasswordIncorrect: "Nomoro ya mogala kgotsa lefoko la sephiri ga di siame",
    ok: "Go siame",
  },

  // HomeScreen translations
  home: {
    gettingLocation: "Re batla lefelo la gago...",
    enterOriginAddress: "Tsenya aterese ya tshimologo...",
    enterDestinationAddress: "Tsenya aterese ya lefelo la bofelo...",
    findingAddress: "Re batla aterese...",
    gettingCurrentLocation: "Re batla lefelo la gago la jaanong...",
    loadingRoute: "Re tsaya tsela...",
    routeLoaded: "Tsela e tsetswe ✓",
    searchingTaxis: "Re batla diteksi tse di leng teng...",
    findingTaxis: "Re Batla Diteksi...",
    searchingDrivers: "Re batla bakgweetsi ba ba leng teng...",
    journeyStatus: "Maemo a Loeto",
    availableTaxis: "Diteksi tse di leng teng:",
    matchingRoutes: "Ditsela tse di tshwanang:",
    readyToBook: "✅ O siametse go beela loeto!",
    noTaxisAvailable: "⚠ Ga go na diteksi mo tseleng eno",
    recentlyUsedRanks: "Mafelo a Diteksi a o Dirisitseng",
    noRecentRoutes: "Ga go na ditsela tse o di dirisitseng.",
    reserveSeat: "Bea Setulo",
    reserveSeatWithCount: "Bea Setulo ({count} diteksi di a teng)",
    usedTimes: "E dirisiwe makgetlo a {count}",
    permissionDenied: "Tetla e gannwe",
    locationPermissionRequired: "Tetla ya lefelo e a tlhokega go bona diteksi tse di gaufi.",
    locationError: "Phoso ya Lefelo",
    unableToGetLocation: "Ga re kgone go bona lefelo la gago la jaanong. Tshwanetse o tsenye aterese ya gago ka seatla.",
    googleMapsNotConfigured: "Google Maps API key ga e a beakangwa",
    addressNotFound: "Ga re kgone go bona aterese. Leka gape.",
    routeError: "Phoso ya Tsela",
    searchError: "Phoso ya go Batla",
    unableToFindTaxis: "Ga re kgone go bona diteksi tse di leng teng. Leka gape.",
    noTaxisAvailableAlert: "Ga go na Diteksi",
    noTaxisAvailableMessage: "Ga go na diteksi tse di leng teng mo ditseleng tse di kopanyang lefelo la gago la tshimologo le la bofelo. Leka tsela e nngwe kgotsa leka gape morago.",
    pleaseEnterAddresses: "Tshwanetse o tsenye di-aterese tsa lefelo la tshimologo le la bofelo",
    routeNotSelected: "Tsela ga e a tlhophiwa",
    unknownError: "Phoso e e sa itsiweng",
    locationStreamingError: "Phoso ya go Latela Lefelo:",
    liveLocationStreaming: "Go Latela Lefelo ka Nako:",
    streamingLocation: "Go latela lefelo...",
  },

  // Booking flow
  booking: {
    selectRoute: "Tlhopha Tsela",
    availableSeats: "Ditulo Tse di Leng Teng",
    reserveSeat: "Bea Setulo",
    bookingConfirmed: "Kopo e Netefaditswe",
    myBookings: "Dikopo Tsame",
    paymentMethod: "Mokgwa wa Tefo",
    totalAmount: "Palomoka ya Madi",
    pickupTime: "Nako ya go Tsaya",
    destination: "Lefelo la Bofelo",
    origin: "Lefelo la Tshimologo",
  },

  // Navigation & Tabs
  navigation: {
    home: "Gae",
    bookings: "Dikopo",
    profile: "Tshwantsho",
    settings: "Dithulaganyo",
    history: "Histori",
    wallet: "Mokotla wa Madi",
    routes: "Ditsela",
    feedback: "Dikakanyo",
    help: "Thuso",
  },

  // Settings
  settings: {
    language: "Puo",
    theme: "Setlhogo",
    notifications: "Dikitsiso",
    support: "Tshegetso",
    aboutApp: "Ka ga Lenaneo",
    privacyPolicy: "Melawana ya Sephiri",
    termsOfService: "Melawana ya Tirelo",
    logout: "Tswa",
  },

  // Notifications
  notifications: {
    rideDeclined: "Loeto lo Ganetswe",
    rideAccepted: "Loeto lo Amogetse",
    rideCancelled: "Loeto lo Khanseletswe",
    rideDeclinedMessage: "Kopo ya gago ya loeto e ganetswe.",
    ok: "Go siame",
  },

// TaxiInformation translations
taxiInfo: {
  availableTaxis: "Diteksi Tse di Leng Teng",
  fromTo: "Go tswa go {origin} go ya {destination}",
  findingAvailableTaxis: "Re batla diteksi tse di leng teng...",
  foundTaxisOnRoutes: "Re bonye diteksi di le {count} tse di Leng Teng",
  onMatchingRoutes: "mo ditseleng di le {count} tse di tshwanang",
  vehicleInfoNotAvailable: "Tshedimosetso ya koloi ga e yo",
  registrationNotAvailable: "Nomoro ya ngodiso ga e yo",
  route: "Tsela:",
  fare: "Tefo:",
  distance: "Bokgole:",
  pickupNear: "O tla tsewa gaufi le:",
  dropOffNear: "O tla folosa gaufi le:",
  callDriver: "Letsetsa Mokgweetsi",
  selected: "✓ O Tlhophetswe",
  select: "Tlhopha",
  journeySummary: "Kakaretso ya Loeto",
  driver: "Mokgweetsi:",
  vehicle: "Koloi:",
  taxiAssociation: "Mokgatlho wa Diteksi:",
  driverDistance: "Bokgole jwa Mokgweetsi:",
  away: "kgole",
  noAvailableTaxis: "Ga go na Diteksi",
  noTaxisMessage: "Ga go na diteksi tse di bonweng mo ditseleng tse di kopanyang lefelo la gago la tshimologo le la bofelo.",
  tryAdjustingLocation: "Leka go fetola lefelo la gago la go tsewa kgotsa leka gape morago.",
  bookRideWith: "Beela Loeto le {name}",
  bookingRide: "Re beela Loeto...",
  rideRequestSent: "Kopo ya Loeto e Rometswe",
  rideRequestMessage: "Kopo ya gago ya loeto e rometswe go {name}. O tla itsisiwe fa mokgweetsi a araba.",
  bookingError: "Phoso ya go Beela",
  bookingErrorMessage: "Go paletse go romela kopo ya loeto. Leka gape.",
  selectTaxiError: "Tshwanetse o tlhophe tekisi mme o netefatse gore o tsenye",
  phoneNotSupported: "Megala ga e a tshegediwa mo sesebedisweng seno",
  couldNotOpenPhone: "Ga re kgone go bula lenaneo la megala",
},
};

// i18n configuration for English, Zulu, and Tswana
i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // Default language
    fallbackLng: 'en',
    debug: __DEV__, // Enable debug in development
    
    resources: {
      en: englishTranslations,
      zu: zuluTranslations,
      tn: tswanaTranslations,
    },
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Default namespace
    defaultNS: 'common',
  });

export default i18n;