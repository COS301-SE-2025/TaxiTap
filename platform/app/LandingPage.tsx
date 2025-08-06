import React from "react";
import { SafeAreaView, View, ScrollView, Image, Text, TouchableOpacity, } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import { useLanguage } from '../contexts/LanguageContext'; // Assuming you have this context

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'isiZulu', value: 'zu' },
];

export default () => {
	const navigation = useNavigation<any>();
	const { t, currentLanguage, changeLanguage } = useLanguage(); // Assuming you have this context

	return (
		<View 
			style={{
				flex: 1,
				backgroundColor: "#232F3E",
			}}>
			<ScrollView  
				style={{
					flex: 1,
					backgroundColor: "#232F3E",
				}}
				contentContainerStyle={{
					flexGrow: 1,
				}}
				showsVerticalScrollIndicator={false}>
				
				{/* Language Selector */}
				<View style={{ 
					marginTop: 50, 
					marginBottom: 20,
					marginHorizontal: 20,
				}}>
					<Dropdown
						data={languageOptions}
						labelField="label"
						valueField="value"
						placeholder="Select Language"
						placeholderStyle={{ color: '#999' }}
						style={{
							backgroundColor: '#fff',
							borderRadius: 10,
							paddingHorizontal: 16,
							paddingVertical: 12,
							borderColor: '#ddd',
							borderWidth: 1,
						}}
						selectedTextStyle={{ 
							fontSize: 16, 
							color: '#232F3E',
							fontWeight: '500'
						}}
						containerStyle={{
							borderRadius: 10,
							borderColor: '#ddd',
						}}
						itemTextStyle={{
							color: '#232F3E',
							fontSize: 16,
						}}
						value={currentLanguage}
						onChange={(item) => changeLanguage(item.value)}
					/>
				</View>

				<View 
					style={{
						flexDirection: "row",
						alignItems: "flex-start",
						marginTop: 20,
						marginBottom: 46,
						marginLeft: 47,
					}}>
					<View 
						style={{
							alignItems: "center",
							marginRight: 11,
						}}>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/qMlslhlkN1/mxkbvvdx_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 129,
								height: 155,
								marginBottom: 16,
							}}
						/>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/qMlslhlkN1/lequemu8_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 135,
								height: 155,
							}}
						/>
					</View>
					<Image
						source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/qMlslhlkN1/tmpetyyk_expires_30_days.png"}} 
						resizeMode = {"stretch"}
						style={{
							width: 158,
							height: 211,
							marginTop: 65,
						}}
					/>
				</View>
				<Text 
					style={{
						fontSize: 36,
						fontWeight: "bold",
						marginBottom: 40,
						marginLeft: 36,
						width: 272,
					}}>
					<Text style={{color: "#FFFFFF"}}>
						{currentLanguage === 'zu' ? "Yeqa " : "Skip the "}
					</Text>
					<Text style={{color: "#FF9900"}}>
						{currentLanguage === 'zu' ? "Ukulinda" : "Wait"}
					</Text>
					<Text style={{color: "#FFFFFF"}}>
						{currentLanguage === 'zu' ? ", \nBeka " : ", \nReserve a "}
					</Text>
					<Text style={{color: "#FF9900"}}>
						{currentLanguage === 'zu' ? "Isihlalo" : "Seat"}
					</Text>
				</Text>
				<Text 
					style={{
						color: "#FFFFFF",
						fontSize: 15,
						fontWeight: "normal",
						lineHeight: 22,
						marginBottom: 49,
						marginHorizontal: 29,
					}}>
					{currentLanguage === 'zu' 
						? "I-Taxi Tap ixhumanisa abagibeli nabashayeli. Abagibeli babeka izihlalo, babelane ngezindawo abaya kuzo, futhi balandelele ukufika, kanti abashayeli besetha imizila, baphathe ukutholakala, futhi baphathe izicelo zokugibela."
						: "Taxi Tap connects passengers and drivers. Passengers reserve seats, share destinations, and track arrivals, while drivers set routes, manage availability, and handle ride requests."
					}
				</Text>
				<View 
					style={{
						alignItems: "center",
						marginBottom: 32,
					}}>
					<TouchableOpacity 
						style={{
							backgroundColor: "#FF9900",
							borderRadius: 30,
							paddingVertical: 16,
							paddingHorizontal: 55,
							minHeight: 48,
							justifyContent: "center",
						}} 
						onPress={() => navigation.navigate('SignUp')}
						accessible={true}
						accessibilityLabel={currentLanguage === 'zu' ? "Qalisa nge-Taxi Tap" : "Get started with Taxi Tap"}
						accessibilityRole="button">
						<Text 
							style={{
								color: "#000000",
								fontSize: 18,
								fontWeight: "600",
								textAlign: "center",
							}}>
							{currentLanguage === 'zu' ? "Ake siqale" : "Let's get started"}
						</Text>
					</TouchableOpacity>
				</View>
				<View 
					style={{
						alignItems: "center",
						marginBottom: 34,
					}}>
					<TouchableOpacity
						onPress={() => navigation.navigate('Login')}
						accessible={true}
						accessibilityLabel={currentLanguage === 'zu' ? "Ngena ku-akhawunti ekhona" : "Sign in to existing account"}
						accessibilityRole="button">
						<Text 
							style={{
								fontSize: 15,
								fontWeight: "normal",
								textDecorationLine: "underline",
							}}>
							<Text style={{color: "#FFFFFF"}}>
								{currentLanguage === 'zu' ? "Usunayo i-akhawunti? " : "Already have an account? "}
							</Text>
							<Text style={{color: "#FF9900"}}>
								{currentLanguage === 'zu' ? "Ngena" : "Sign in"}
							</Text>
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	)
}