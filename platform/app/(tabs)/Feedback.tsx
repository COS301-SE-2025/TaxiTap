import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function FeedbackScreen() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackList, setFeedbackList] = useState<
    { rating: number; comment: string; time: string }[]
  >([]);
  const { theme, isDark } = useTheme();

  const handleSubmit = () => {
    if (!rating && !comment) {
      Alert.alert('No Input', 'Please provide a rating or comment');
      return;
    }

    const newEntry = {
      rating,
      comment,
      time: new Date().toLocaleString(),
    };

    setFeedbackList([newEntry, ...feedbackList]);
    setRating(0);
    setComment('');
  };

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
      paddingTop: 40,
    },
    contentContainer: {
      paddingBottom: 60,
    },
    userInfoCard: {
      backgroundColor: isDark ? theme.surface : '#F5D9B2',
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      marginBottom: 30,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    userIconContainer: {
      backgroundColor: isDark ? theme.primary : '#000',
      borderRadius: 50,
      padding: 12,
      marginBottom: 10,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    userDetails: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 10,
    },
    ratingContainer: {
      flexDirection: 'row',
      marginBottom: 30,
    },
    commentInput: {
      backgroundColor: isDark ? theme.surface : '#F5D9B2',
      borderRadius: 20,
      padding: 16,
      height: 120,
      fontSize: 16,
      color: theme.text,
      marginBottom: 30,
      textAlignVertical: 'top',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 30,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    submitButtonText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#232f3e',
    },
    historyContainer: {
      padding: 16,
      backgroundColor: isDark ? theme.surface : '#F5D9B2',
      borderRadius: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    historyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: theme.text,
    },
    historyEntry: {
      marginBottom: 12,
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    historyText: {
      color: theme.text,
      marginBottom: 4,
    },
    historyLabel: {
      fontWeight: 'bold',
      color: theme.text,
    },
    historyTime: {
      color: theme.textSecondary,
      marginBottom: 4,
      alignSelf: 'flex-end',
    },
  });

  return (
    <ScrollView
      style={dynamicStyles.container}
      contentContainerStyle={dynamicStyles.contentContainer}
    >
      {/* User Info */}
      <View style={dynamicStyles.userInfoCard}>
        <View style={dynamicStyles.userIconContainer}>
          <FontAwesome 
            name="user" 
            size={24} 
            color={isDark ? '#FFFFFF' : 'orange'} 
          />
        </View>
        <Text style={dynamicStyles.userName}>
          Tshepo Mthembu
        </Text>
        <Text style={dynamicStyles.userDetails}>
          Tuesday Morning to Menlyn Taxi Rank
        </Text>
      </View>

      {/* Rating */}
      <Text style={dynamicStyles.sectionTitle}>
        Rating
      </Text>
      <View style={dynamicStyles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isSelected = star <= rating;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => {
                if (rating === star && rating === 1) {
                  setRating(0);
                } else {
                  setRating(star);
                }
              }}
            >
              <FontAwesome
                name={isSelected ? 'star' : 'star-o'}
                size={30}
                color={theme.primary}
                style={{ marginRight: 8 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comment */}
      <Text style={dynamicStyles.sectionTitle}>
        Leave a comment
      </Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Type your feedback here..."
        placeholderTextColor={theme.textSecondary}
        multiline
        style={dynamicStyles.commentInput}
      />

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        style={dynamicStyles.submitButton}
      >
        <Text style={dynamicStyles.submitButtonText}>
          Submit Response
        </Text>
      </TouchableOpacity>

      {/* Feedback History */}
      {feedbackList.length > 0 && (
        <View style={dynamicStyles.historyContainer}>
          <Text style={dynamicStyles.historyTitle}>
            Feedback History
          </Text>
          {feedbackList.map((entry, index) => (
            <View
              key={index}
              style={dynamicStyles.historyEntry}
            >
              {entry.rating > 0 && (
                <Text style={dynamicStyles.historyText}>
                  <Text style={dynamicStyles.historyLabel}>Rating:</Text> {entry.rating}
                </Text>
              )}
              {entry.comment ? (
                <Text style={dynamicStyles.historyText}>
                  <Text style={dynamicStyles.historyLabel}>Comment:</Text> {entry.comment}
                </Text>
              ) : null}
              <Text style={dynamicStyles.historyTime}>
                {entry.time}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}