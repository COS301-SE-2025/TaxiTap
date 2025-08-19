import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, Image, SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAlertHelpers } from '../../components/AlertHelpers';

export default function SubmitFeedbackScreen() {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { showGlobalError, showGlobalSuccess } = useAlertHelpers();

  const saveFeedback = useMutation(api.functions.feedback.saveFeedback.saveFeedback);

  const { rideId, startName, endName, passengerId, driverId } = useLocalSearchParams<{
    rideId?: string; startName?: string; endName?: string; passengerId?: string; driverId?: string;
  }>();

  useEffect(() => { if (user) setName(user.name || ''); }, [user]);

  const handleSubmit = async () => {
    if (!rating && !comment) {
      showGlobalError('No Input', 'Please provide a rating or comment', { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    if (!rideId || !passengerId || !driverId || !startName || !endName) {
      showGlobalError('Missing info', 'Cannot submit feedback: Missing ride/user info.', { duration: 5000, position: 'top', animation: 'slide-down' });
      return;
    }

    try {
      await saveFeedback({
        rideId: rideId as any,
        passengerId: passengerId as any,
        driverId: driverId as any,
        rating,
        comment,
        startLocation: startName,
        endLocation: endName,
      });

      setRating(0);
      setComment('');
      showGlobalSuccess('Success', 'Feedback submitted successfully!', {
        duration: 0,
        position: 'top',
        animation: 'slide-down',
        actions: [
          { label: 'OK', onPress: () => router.push('/FeedbackHistoryScreen'), style: 'default' },
        ],
      });
    } catch (err: any) {
      showGlobalError('Error', err.message || 'Something went wrong.', { duration: 5000, position: 'top', animation: 'slide-down' });
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: 'images', 
        allowsEditing: true, 
        quality: 1,
        aspect: [1, 1]
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {}
  };

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },
    headerSection: {
      alignItems: 'center',
      paddingVertical: 32,
      marginBottom: 24,
    },
    profileImageContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    cameraIconOverlay: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: '#f90',
      borderRadius: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.background,
    },
    userName: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    rideInfoContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      width: '100%',
    },
    rideInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    lastRideInfoRow: {
      marginBottom: 0,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rideInfoContent: {
      flex: 1,
    },
    rideInfoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    rideInfoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 8,
      paddingHorizontal: 4,
    },
    section: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      overflow: 'hidden',
    },
    ratingSection: {
      padding: 20,
    },
    ratingTitle: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    starButton: {
      padding: 8,
    },
    commentSection: {
      padding: 20,
    },
    commentTitle: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.text,
      marginBottom: 16,
    },
    commentInput: {
      backgroundColor: isDark 
        ? 'rgba(255,255,255,0.05)' 
        : 'rgba(0,0,0,0.03)',
      color: theme.text,
      height: 120,
      borderRadius: 12,
      padding: 16,
      textAlignVertical: 'top',
      fontSize: 16,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.08)',
    },
    buttonContainer: {
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 20,
      marginTop: 8,
    },
    submitButton: {
      backgroundColor: '#f90',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      borderWidth: 2,
      borderColor: '#D97706',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
    },
    skipButton: {
      backgroundColor: isDark 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.05)',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      minHeight: 56,
    },
    skipButtonText: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Profile and Ride Info */}
        <View style={dynamicStyles.headerSection}>
          <Pressable onPress={handleUploadPhoto} style={dynamicStyles.profileImageContainer}>
            <View style={dynamicStyles.profileImage}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={48} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
              )}
            </View>
            <View style={dynamicStyles.cameraIconOverlay}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </Pressable>
          
          <Text style={dynamicStyles.userName}>{name}</Text>
          
          {/* Ride Info Section - styled exactly like PassengerProfile */}
          <View style={dynamicStyles.rideInfoContainer}>
            <View style={dynamicStyles.rideInfoRow}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>From</Text>
                <Text style={dynamicStyles.rideInfoText}>{startName ?? 'N/A'}</Text>
              </View>
            </View>
            <View style={[dynamicStyles.rideInfoRow, dynamicStyles.lastRideInfoRow]}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>To</Text>
                <Text style={dynamicStyles.rideInfoText}>{endName ?? 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rating Section */}
        <Text style={dynamicStyles.sectionHeader}>Rate Your Experience</Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.ratingSection}>
            <Text style={dynamicStyles.ratingTitle}>How was your ride?</Text>
            <View style={dynamicStyles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setRating(star)}
                  style={dynamicStyles.starButton}
                  activeOpacity={0.7}
                >
                  <FontAwesome 
                    name={rating >= star ? 'star' : 'star-o'} 
                    size={36} 
                    color={rating >= star ? '#F59E0B' : theme.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Comment Section */}
        <Text style={dynamicStyles.sectionHeader}>Share Your Feedback</Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.commentSection}>
            <Text style={dynamicStyles.commentTitle}>Tell us about your experience</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your thoughts about the ride..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
              style={dynamicStyles.commentInput}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={dynamicStyles.buttonContainer}>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={dynamicStyles.submitButton}
            activeOpacity={0.9}
          >
            <Text style={dynamicStyles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push('/HomeScreen')}
            style={dynamicStyles.skipButton}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.skipButtonText}>
              Skip Feedback
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}