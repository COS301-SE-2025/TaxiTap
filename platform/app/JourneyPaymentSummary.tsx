import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';

interface JourneyPaymentSummaryProps {
  journeyId: string;
}

export default function JourneyPaymentSummary({ journeyId }: JourneyPaymentSummaryProps) {
  const router = useRouter();

  const journeyPaymentData = useQuery(api.functions.journeys.multiLegPayment.getJourneyPaymentSummary, {
    journeyId,
  });

  if (!journeyPaymentData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment summary...</Text>
      </View>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />;
      case 'pending':
        return <Ionicons name="time-outline" size={20} color="#FF9900" />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color="#E74C3C" />;
      default:
        return <Ionicons name="help-circle" size={20} color="#95A5A6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#2ECC71';
      case 'pending':
        return '#FF9900';
      case 'failed':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Journey Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerInfo}>
          <Text style={styles.journeyTitle}>Multi-Leg Journey Payment Summary</Text>
          <Text style={styles.journeyRoute}>
            {journeyPaymentData.journey.originAddress} → {journeyPaymentData.journey.destinationAddress}
          </Text>
        </View>
        <View style={styles.overallStatus}>
          <Text style={[styles.statusText, { color: getStatusColor(journeyPaymentData.overallStatus) }]}>
            {journeyPaymentData.overallStatus === 'completed' ? 'All Paid' : 'Pending Payment'}
          </Text>
        </View>
      </View>

      {/* Payment Progress */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Payment Progress</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(journeyPaymentData.completedLegs / journeyPaymentData.totalLegs) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {journeyPaymentData.completedLegs} of {journeyPaymentData.totalLegs} legs paid
        </Text>
      </View>

      {/* Payment Totals */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Payment Totals</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Estimated Total:</Text>
          <Text style={styles.totalAmount}>R{journeyPaymentData.totalEstimatedFare.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Paid:</Text>
          <Text style={[styles.totalAmount, { color: '#2ECC71' }]}>
            R{journeyPaymentData.totalActualPaid.toFixed(2)}
          </Text>
        </View>
        {journeyPaymentData.pendingLegs > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Remaining:</Text>
            <Text style={[styles.totalAmount, { color: '#FF9900' }]}>
              R{(journeyPaymentData.totalEstimatedFare - journeyPaymentData.totalActualPaid).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Individual Leg Details */}
      <View style={styles.legsCard}>
        <Text style={styles.legsTitle}>Leg Details</Text>
        {journeyPaymentData.legSummaries.map((leg, index) => (
          <View key={index} style={styles.legItem}>
            <View style={styles.legHeader}>
              <View style={styles.legNumber}>
                <Text style={styles.legNumberText}>{leg.legIndex + 1}</Text>
              </View>
              <View style={styles.legInfo}>
                <Text style={styles.legRoute}>
                  {leg.fromAddress} → {leg.toAddress}
                </Text>
                <Text style={styles.legFare}>R{leg.actualFare.toFixed(2)}</Text>
              </View>
              <View style={styles.legStatus}>
                {getStatusIcon(leg.paymentStatus)}
              </View>
            </View>

            {leg.paymentStatus === 'completed' && leg.paymentConfirmedAt && (
              <Text style={styles.legPaymentTime}>
                Paid {new Date(leg.paymentConfirmedAt).toLocaleString()}
              </Text>
            )}

            {leg.paymentStatus === 'pending' && (
              <Text style={styles.legPendingText}>Payment required to continue</Text>
            )}
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsCard}>
        {journeyPaymentData.overallStatus === 'completed' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => router.push('/HomeScreen')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Journey Complete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton]}
            onPress={() => router.push('/HomeScreen')}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Continue Journey</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.helpButton]}
          onPress={() => {
            // Navigate to help or support
          }}
        >
          <Ionicons name="help-circle" size={20} color="#007AFF" />
          <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>Need Help?</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // Header Card
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  journeyRoute: {
    fontSize: 14,
    color: '#666',
  },
  overallStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Totals Card
  totalsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
  },

  // Legs Card
  legsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  legsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 16,
  },
  legItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9900',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  legNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  legInfo: {
    flex: 1,
  },
  legRoute: {
    fontSize: 14,
    color: '#2B2B2B',
    marginBottom: 2,
  },
  legFare: {
    fontSize: 12,
    color: '#666',
  },
  legStatus: {
    marginLeft: 12,
  },
  legPaymentTime: {
    fontSize: 12,
    color: '#2ECC71',
    marginLeft: 44,
    marginTop: 4,
  },
  legPendingText: {
    fontSize: 12,
    color: '#FF9900',
    marginLeft: 44,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Actions Card
  actionsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#2ECC71',
  },
  continueButton: {
    backgroundColor: '#FF9900',
  },
  helpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});