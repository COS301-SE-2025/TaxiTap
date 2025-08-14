import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, Image,
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

  const { theme } = useTheme();
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 1 });
    if (!result.canceled && result.assets.length > 0) { setImageUri(result.assets[0].uri); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background, padding: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable onPress={handleUploadPhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 150, height: 150, borderRadius: 75 }} />
          ) : (
            <Ionicons name="person-circle" size={100} color={theme.text} />
          )}
        </Pressable>
        <Text>{name}</Text>
        <Text>From: {startName ?? 'N/A'}</Text>
        <Text>To: {endName ?? 'N/A'}</Text>
      </View>

      <Text style={{ color: theme.text, fontSize: 18, marginBottom: 8 }}>Rating</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <FontAwesome name={rating >= star ? 'star' : 'star-o'} size={30} color={theme.primary} />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Type your feedback here..."
        placeholderTextColor={theme.textSecondary}
        style={{
          backgroundColor: theme.surface,
          color: theme.text,
          height: 100,
          borderRadius: 10,
          padding: 12,
          textAlignVertical: 'top',
          marginBottom: 20,
        }}
        multiline
      />

      <TouchableOpacity onPress={handleSubmit} style={{ backgroundColor: theme.primary, padding: 16, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>Submit Feedback</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/HomeScreen')}
        style={{
          backgroundColor: theme.surface,
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.primary,
          marginTop: 8,
        }}
      >
        <Text style={{ color: theme.primary, fontSize: 18, textAlign: 'center'}}>
          Skip Feedback
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}