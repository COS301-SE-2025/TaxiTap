import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function FeedbackHistoryScreen() {
  const { theme } = useTheme();
  const { user } = useUser();

  const feedbackList = useQuery(
    api.functions.feedback.showFeedback.showFeedbackPassenger,
    user?.id ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 24, color: theme.text, marginBottom: 16 }}>Your Feedback History</Text>

      {!feedbackList ? (
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      ) : feedbackList.length === 0 ? (
        <Text style={{ color: theme.textSecondary }}>You haven’t received any feedback yet.</Text>
      ) : (
        feedbackList.map((entry, index) => (
          <View
            key={entry._id}
            style={{
              backgroundColor: theme.surface,
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
              elevation: 2,
            }}
          >
            {entry.rating > 0 && (
              <Text style={{ color: theme.text }}>⭐ Rating: {entry.rating}</Text>
            )}
            {entry.comment && (
              <Text style={{ color: theme.text }}>📝 Comment: {entry.comment}</Text>
            )}
            {(entry.startLocation || entry.endLocation) && (
              <View>
                <Text style={{ color: theme.text }}>
                  From: {entry.startLocation || 'N/A'}
                </Text>
                <Text style={{ color: theme.text }}>
                  To: {entry.endLocation || 'N/A'}
                </Text>
              </View>
            )}
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}