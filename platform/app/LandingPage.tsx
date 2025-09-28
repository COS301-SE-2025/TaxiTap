import React, { useState } from "react";
import { SafeAreaView, View, ScrollView, Image, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLanguage } from '../contexts/LanguageContext';

// Import local images
import southAfricanTaxi from '../assets/images/south-african-black-taxi-common-260nw-1746541244.jpg';
import iconDarkImage from '../assets/images/icon-dark.png';

const languageOptions = [
  { label: 'English', value: 'en', flag: '🇬🇧' },
  { label: 'isiZulu', value: 'zu', flag: '🇿🇦' },
  { label: 'Setswana', value: 'tn', flag: '🇧🇼' },
  { label: 'Afrikaans', value: 'af', flag: '🇿🇦' },
];

// Globe Icon Component
const GlobeIcon = ({ size = 24, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <Path 
      d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

export default () => {
	const navigation = useNavigation<any>();
	const { currentLanguage, changeLanguage } = useLanguage();
	const [showLanguageModal, setShowLanguageModal] = useState(false);

	// Hardcoded translations
	const translations = {
		en: {
			skipThe: "Skip the ",
			wait: "Wait",
			reserveA: ", \nReserve a ",
			seat: "Seat",
			welcomeMessage: "Welcome to TaxiTap!\nYour reliable ride-sharing companion.",
			description: "Taxi Tap connects passengers and drivers. Passengers reserve seats, share destinations, and track arrivals, while drivers set routes, manage availability, and handle ride requests.",
			getStartedWithTaxiTap: "Get started with Taxi Tap",
			letsGetStarted: "Let's get started",
			signInToExistingAccount: "Sign in to existing account",
			alreadyHaveAccount: "Already have an account? ",
			signIn: "Sign in",
			selectLanguage: "Select Language"
		},
		tn: {
			skipThe: "Tlola ",
			wait: "go leta",
			reserveA: ", \nbea ",
			seat: "setulo",
			welcomeMessage: "Re amogela mo TaxiTap!\nMolekane wa gago wa go abelana leeto.",
			description: "Taxi Tap e kopanya bapalami le bakgweetsi. Bapalami ba bea ditulo, ba abelana mafelo a ba yang teng, le go sala morago phitlhelo, fa bakgweetsi ba bea ditsela, ba laola go nna teng, le go tshwara dikopo tsa dinamelwa.",
			getStartedWithTaxiTap: "A re simolole ka Taxi Tap",
			letsGetStarted: "A re simolole",
			signInToExistingAccount: "Tsena mo akhaonteng e e leng teng",
			alreadyHaveAccount: "O nale akhaonte? ",
			signIn: "Tsena",
			selectLanguage: "Tlhopha Puo"
		},
		zu: {
			skipThe: "Yeqa ",
			wait: "Ukulinda",
			reserveA: ", \nBeka ",
			seat: "Isihlalo",
			welcomeMessage: "Siyakwamukela ku-TaxiTap!\nUmngane wakho wokuhamba ngokwabelana.",
			description: "I-Taxi Tap ixhumanisa abagibeli nabashayeli. Abagibeli babeka izihlalo, babelane ngezindawo abaya kuzo, futhi balandelele ukufika, kanti abashayeli besetha imizila, baphathe ukutholakala, futhi baphathe izicelo zokugibela.",
			getStartedWithTaxiTap: "Qalisa nge-Taxi Tap",
			letsGetStarted: "Ake siqale",
			signInToExistingAccount: "Ngena ku-akhawunti ekhona",
			alreadyHaveAccount: "Usunayo i-akhawunti? ",
			signIn: "Ngena",
			selectLanguage: "Khetha Ulimi"
		},
		af: {
			skipThe: "Slaan die ",
			wait: "wag oor",
			reserveA: ", \nBespreek 'n ",
			seat: "Sitplek",
			welcomeMessage: "Welkom by TaxiTap!\nJou betroubare rit-deel metgesel.",
			description: "Taxi Tap verbind passasiers en bestuurders. Passasiers bespreek sitplekke, deel bestemmings, en volg aankomste, terwyl bestuurders roetes stel, beskikbaarheid bestuur, en ritversoeke hanteer.",
			getStartedWithTaxiTap: "Begin met Taxi Tap",
			letsGetStarted: "Kom ons begin",
			signInToExistingAccount: "Teken in by bestaande rekening",
			alreadyHaveAccount: "Het jy reeds 'n rekening? ",
			signIn: "Teken in",
			selectLanguage: "Kies Taal"
		}
	};

	const t = (key: string) => {
		const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
		return translations[lang][key as keyof typeof translations[typeof lang]] || key;
	};

	// Get current language label
	const getCurrentLanguageLabel = () => {
		const current = languageOptions.find(lang => lang.value === currentLanguage);
		return current?.label || 'English';
	};

	return (
		<View style={styles.container}>
			{/* Language Button - Top Right */}
			<TouchableOpacity 
				style={styles.languageButton}
				onPress={() => setShowLanguageModal(true)}
				accessible={true}
				accessibilityLabel="Change language"
				accessibilityRole="button">
				<GlobeIcon size={24} color="#FFFFFF" />
				<Text style={styles.languageButtonText}>
					{currentLanguage.toUpperCase()}
				</Text>
			</TouchableOpacity>

			<ScrollView  
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}>
				
				{/* Images Section */}
				<View style={styles.imagesContainer}>
					<View style={styles.leftImages}>
						<Image
							source={southAfricanTaxi} 
							resizeMode="cover"
							style={styles.topLeftImage}
						/>
						<Image
							source={require('../assets/images/Taxi rap.jpg')} 
							resizeMode="cover"
							style={styles.bottomLeftImage}
						/>
					</View>
					<Image
						source={iconDarkImage} 
						resizeMode="cover"
						style={styles.rightImage}
					/>
				</View>

				{/* Title Text */}
				<Text style={styles.title}>
					<Text style={styles.titleWhite}>
						{t('skipThe')}
					</Text>
					<Text style={styles.titleOrange}>
						{t('wait')}
					</Text>
					<Text style={styles.titleWhite}>
						{t('reserveA')}
					</Text>
					<Text style={styles.titleOrange}>
						{t('seat')}
					</Text>
				</Text>

				{/* Description */}
				<Text style={styles.description}>
					{t('description')}
				</Text>

				{/* Get Started Button */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity 
						style={styles.getStartedButton} 
						onPress={() => navigation.navigate('SignUp')}
						accessible={true}
						accessibilityLabel={t('getStartedWithTaxiTap')}
						accessibilityRole="button">
						<Text style={styles.getStartedText}>
							{t('letsGetStarted')}
						</Text>
					</TouchableOpacity>
				</View>

				{/* Sign In Link */}
				<View style={styles.signInContainer}>
					<TouchableOpacity
						onPress={() => navigation.navigate('Login')}
						accessible={true}
						accessibilityLabel={t('signInToExistingAccount')}
						accessibilityRole="button">
						<Text style={styles.signInText}>
							<Text style={styles.signInTextWhite}>
								{t('alreadyHaveAccount')}
							</Text>
							<Text style={styles.signInTextOrange}>
								{t('signIn')}
							</Text>
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Language Selection Modal */}
			<Modal
				visible={showLanguageModal}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowLanguageModal(false)}>
				<TouchableOpacity 
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setShowLanguageModal(false)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{t('selectLanguage')}
							</Text>
							<TouchableOpacity
								onPress={() => setShowLanguageModal(false)}
								style={styles.closeButton}>
								<Text style={styles.closeButtonText}>✕</Text>
							</TouchableOpacity>
						</View>
						
						{languageOptions.map((option) => (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.languageOption,
									currentLanguage === option.value && styles.selectedLanguage
								]}
								onPress={() => {
									changeLanguage(option.value);
									setShowLanguageModal(false);
								}}>
								<Text style={styles.flagEmoji}>{option.flag}</Text>
								<Text style={[
									styles.languageOptionText,
									currentLanguage === option.value && styles.selectedLanguageText
								]}>
									{option.label}
								</Text>
								{currentLanguage === option.value && (
									<Text style={styles.checkmark}>✓</Text>
								)}
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#232F3E",
	},
	languageButton: {
		position: 'absolute',
		top: 50,
		right: 20,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		zIndex: 10,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	languageButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 6,
	},
	scrollView: {
		flex: 1,
		backgroundColor: "#232F3E",
	},
	scrollContent: {
		flexGrow: 1,
		paddingTop: 100, // Add padding to account for the language button
	},
	imagesContainer: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginTop: 20,
		marginBottom: 46,
		marginLeft: 47,
	},
	leftImages: {
		alignItems: "center",
		marginRight: 11,
	},
	topLeftImage: {
		width: 129,
		height: 155,
		marginBottom: 16,
		borderRadius: 15,
	},
	bottomLeftImage: {
		width: 135,
		height: 155,
		borderRadius: 15,
	},
	rightImage: {
		width: 158,
		height: 211,
		marginTop: 65,
		borderRadius: 15,
	},
	title: {
		fontSize: 36,
		fontWeight: "bold",
		marginBottom: 40,
		marginLeft: 36,
		width: 272,
	},
	titleWhite: {
		color: "#FFFFFF",
	},
	titleOrange: {
		color: "#FF9900",
	},
	description: {
		color: "#FFFFFF",
		fontSize: 15,
		fontWeight: "normal",
		lineHeight: 22,
		marginBottom: 49,
		marginHorizontal: 29,
	},
	buttonContainer: {
		alignItems: "center",
		marginBottom: 32,
	},
	getStartedButton: {
		backgroundColor: "#FF9900",
		borderRadius: 30,
		paddingVertical: 16,
		paddingHorizontal: 55,
		minHeight: 48,
		justifyContent: "center",
	},
	getStartedText: {
		color: "#000000",
		fontSize: 18,
		fontWeight: "600",
		textAlign: "center",
	},
	signInContainer: {
		alignItems: "center",
		marginBottom: 44,
	},
	signInText: {
		fontSize: 15,
		fontWeight: "normal",
		textDecorationLine: "underline",
	},
	signInTextWhite: {
		color: "#FFFFFF",
	},
	signInTextOrange: {
		color: "#FF9900",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#FFFFFF',
		borderRadius: 15,
		padding: 20,
		width: '80%',
		maxWidth: 300,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#232F3E',
	},
	closeButton: {
		padding: 5,
	},
	closeButtonText: {
		fontSize: 20,
		color: '#666',
	},
	languageOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 15,
		paddingHorizontal: 10,
		borderRadius: 10,
		marginBottom: 5,
	},
	selectedLanguage: {
		backgroundColor: '#F0F8FF',
	},
	flagEmoji: {
		fontSize: 24,
		marginRight: 15,
	},
	languageOptionText: {
		fontSize: 16,
		color: '#232F3E',
		flex: 1,
	},
	selectedLanguageText: {
		fontWeight: '600',
		color: '#FF9900',
	},
	checkmark: {
		fontSize: 18,
		color: '#FF9900',
		fontWeight: 'bold',
	},
});