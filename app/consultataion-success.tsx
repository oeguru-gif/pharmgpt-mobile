import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ConsultationSuccess() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [consultationDetails, setConsultationDetails] = useState<any>(null);

  useEffect(() => {
    if (session_id) {
      verifyPaymentStatus(session_id as string);
    } else {
      setLoading(false);
      Alert.alert('Error', 'No payment session found');
    }
  }, [session_id]);

  const verifyPaymentStatus = async (sessionId: string, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setLoading(false);
      Alert.alert('Error', 'Payment verification timeout. Please check your consultation history.');
      return;
    }

    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/payments/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === 'paid') {
        setPaymentStatus('success');
        setLoading(false);
        
        // Load consultation details if available
        if (data.consultation_request_id) {
          try {
            const consultationResponse = await axios.get(
              `${EXPO_PUBLIC_BACKEND_URL}/api/consultations/${data.consultation_request_id}`
            );
            setConsultationDetails(consultationResponse.data);
          } catch (error) {
            console.error('Failed to load consultation details:', error);
          }
        }
        return;
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
        setLoading(false);
        return;
      }

      // Continue polling if payment is still pending
      setTimeout(() => verifyPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error verifying payment:', error);
      if (attempts < 3) {
        setTimeout(() => verifyPaymentStatus(sessionId, attempts + 1), pollInterval);
      } else {
        setLoading(false);
        setPaymentStatus('error');
      }
    }
  };

  const handleContinue = () => {
    router.replace('/consultations');
  };

  const renderSuccess = () => (
    <View style={styles.container}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
        </View>

        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>
          Your consultation has been booked successfully
        </Text>

        {consultationDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Consultation Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Title:</Text>
              <Text style={styles.detailValue}>{consultationDetails.title}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{consultationDetails.contact_email}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Regulatory Context:</Text>
              <Text style={styles.detailValue}>{consultationDetails.regulatory_context}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, styles.confirmedStatus]}>
                {consultationDetails.status}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <View style={styles.stepItem}>
            <Ionicons name="mail" size={20} color="#4a90e2" />
            <Text style={styles.stepText}>
              You will receive a confirmation email shortly
            </Text>
          </View>
          
          <View style={styles.stepItem}>
            <Ionicons name="calendar" size={20} color="#4a90e2" />
            <Text style={styles.stepText}>
              Our team will contact you within 24 hours to schedule your consultation
            </Text>
          </View>
          
          <View style={styles.stepItem}>
            <Ionicons name="videocam" size={20} color="#4a90e2" />
            <Text style={styles.stepText}>
              You'll receive meeting details and preparation materials
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
          <Text style={styles.continueButtonText}>View My Consultations</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={80} color="#f44336" />
        </View>

        <Text style={styles.errorTitle}>Payment Failed</Text>
        <Text style={styles.errorSubtitle}>
          {paymentStatus === 'expired' 
            ? 'Your payment session has expired'
            : 'There was an issue processing your payment'
          }
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/consultations')}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingTitle}>Verifying Payment</Text>
        <Text style={styles.loadingSubtitle}>
          Please wait while we confirm your payment...
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? renderLoading() : paymentStatus === 'success' ? renderSuccess() : renderError()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  detailsTitle: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  confirmedStatus: {
    color: '#4caf50',
    textTransform: 'capitalize',
  },
  nextStepsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  nextStepsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  stepText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  loadingSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
