import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Consultant {
  id: string;
  name: string;
  title: string;
  expertise_areas: string[];
  experience_years: number;
  education: string[];
  certifications: string[];
  bio: string;
  hourly_rate: number;
  availability_schedule: { [key: string]: string[] };
  rating: number;
  total_consultations: number;
  languages: string[];
  profile_image?: string;
  is_active: boolean;
}

interface ConsultationPackage {
  name: string;
  duration: number;
  price: number;
  description: string;
  features: string[];
}

interface ConsultationRequest {
  id: string;
  consultant_id: string;
  package_id: string;
  title: string;
  description: string;
  preferred_date: string;
  preferred_time: string;
  urgency_level: string;
  regulatory_context: string;
  company_name?: string;
  contact_email: string;
  phone_number?: string;
  status: string;
  payment_status: string;
  created_at: string;
}

const URGENCY_LEVELS = [
  { label: 'Normal', value: 'normal', color: '#4caf50' },
  { label: 'High', value: 'high', color: '#ff9800' },
  { label: 'Emergency', value: 'emergency', color: '#f44336' }
];

const REGULATORY_OPTIONS = [
  { label: 'GMP', value: 'GMP' },
  { label: 'USFDA', value: 'USFDA' },
  { label: 'ICH', value: 'ICH' },
  { label: 'EDQM', value: 'EDQM' },
  { label: 'PMDA', value: 'PMDA' }
];

export default function Consultations() {
  const [activeTab, setActiveTab] = useState<'browse' | 'book' | 'history'>('browse');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [packages, setPackages] = useState<{ [key: string]: ConsultationPackage }>({});
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [consultationHistory, setConsultationHistory] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState('');

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    title: '',
    description: '',
    preferred_date: '',
    preferred_time: '',
    urgency_level: 'normal',
    regulatory_context: 'GMP',
    company_name: '',
    contact_email: '',
    phone_number: ''
  });

  useEffect(() => {
    loadConsultants();
    loadPackages();
    loadConsultationHistory();
    checkPaymentReturn();
  }, []);

  const checkPaymentReturn = () => {
    // Check if returning from payment
    const urlParams = new URLSearchParams(window?.location?.search || '');
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      setPaymentSessionId(sessionId);
      setShowPaymentStatus(true);
      pollPaymentStatus(sessionId);
    }
  };

  const pollPaymentStatus = async (sessionId: string, attempts = 0): Promise<void> => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      Alert.alert('Error', 'Payment status check timed out. Please check your consultation history.');
      setShowPaymentStatus(false);
      return;
    }

    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/payments/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === 'paid') {
        Alert.alert(
          'Payment Successful!',
          'Your consultation has been booked successfully. You will receive a confirmation email shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPaymentStatus(false);
                setActiveTab('history');
                loadConsultationHistory();
              }
            }
          ]
        );
        return;
      } else if (data.status === 'expired') {
        Alert.alert('Payment Expired', 'Your payment session has expired. Please try booking again.');
        setShowPaymentStatus(false);
        return;
      }

      // Continue polling if payment is still pending
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempts < 3) {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      } else {
        Alert.alert('Error', 'Unable to verify payment status. Please check your consultation history.');
        setShowPaymentStatus(false);
      }
    }
  };

  const loadConsultants = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/consultants`);
      setConsultants(response.data);
    } catch (error) {
      console.error('Failed to load consultants:', error);
      Alert.alert('Error', 'Failed to load consultants. Please try again.');
    }
  };

  const loadPackages = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/consultation-packages`);
      setPackages(response.data);
    } catch (error) {
      console.error('Failed to load packages:', error);
      Alert.alert('Error', 'Failed to load consultation packages. Please try again.');
    }
  };

  const loadConsultationHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('pharma_user_id');
      if (userId) {
        const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/consultations/user/${userId}`);
        setConsultationHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load consultation history:', error);
    }
  };

  const handleBookConsultation = async () => {
    if (!selectedConsultant || !selectedPackage) {
      Alert.alert('Error', 'Please select a consultant and package.');
      return;
    }

    if (!bookingForm.title || !bookingForm.description || !bookingForm.contact_email || 
        !bookingForm.preferred_date || !bookingForm.preferred_time) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        consultant_id: selectedConsultant.id,
        package_id: selectedPackage,
        ...bookingForm
      };

      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/consultations/book`, bookingData);
      
      // Redirect to Stripe Checkout
      if (response.data.checkout_url) {
        Linking.openURL(response.data.checkout_url);
        setShowBookingModal(false);
      } else {
        Alert.alert('Error', 'Failed to create payment session.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderExpertiseChips = (areas: string[]) => (
    <View style={styles.expertiseContainer}>
      {areas.slice(0, 3).map((area, index) => (
        <View key={index} style={styles.expertiseChip}>
          <Text style={styles.expertiseText}>{area}</Text>
        </View>
      ))}
      {areas.length > 3 && (
        <View style={styles.expertiseChip}>
          <Text style={styles.expertiseText}>+{areas.length - 3} more</Text>
        </View>
      )}
    </View>
  );

  const renderRating = (rating: number) => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#ffa726"
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );

  const renderConsultantCard = (consultant: Consultant) => (
    <TouchableOpacity
      key={consultant.id}
      style={styles.consultantCard}
      onPress={() => {
        setSelectedConsultant(consultant);
        setShowConsultantModal(true);
      }}
    >
      <View style={styles.consultantHeader}>
        <View style={styles.consultantAvatar}>
          <Ionicons name="person" size={32} color="#4a90e2" />
        </View>
        <View style={styles.consultantInfo}>
          <Text style={styles.consultantName}>{consultant.name}</Text>
          <Text style={styles.consultantTitle}>{consultant.title}</Text>
          {renderRating(consultant.rating)}
        </View>
        <View style={styles.consultantStats}>
          <Text style={styles.statText}>${consultant.hourly_rate}/hr</Text>
          <Text style={styles.statSubtext}>{consultant.total_consultations} consultations</Text>
        </View>
      </View>

      <Text style={styles.consultantBio} numberOfLines={2}>
        {consultant.bio}
      </Text>

      {renderExpertiseChips(consultant.expertise_areas)}

      <View style={styles.consultantFooter}>
        <View style={styles.experienceContainer}>
          <Ionicons name="briefcase" size={14} color="#4a90e2" />
          <Text style={styles.experienceText}>{consultant.experience_years} years experience</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            setSelectedConsultant(consultant);
            setShowBookingModal(true);
          }}
        >
          <Text style={styles.bookButtonText}>Book Consultation</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPackageCard = (packageId: string, packageData: ConsultationPackage) => (
    <TouchableOpacity
      key={packageId}
      style={[
        styles.packageCard,
        selectedPackage === packageId && styles.selectedPackageCard
      ]}
      onPress={() => setSelectedPackage(packageId)}
    >
      <View style={styles.packageHeader}>
        <Text style={styles.packageName}>{packageData.name}</Text>
        <Text style={styles.packagePrice}>${packageData.price}</Text>
      </View>
      <Text style={styles.packageDuration}>{packageData.duration} minutes</Text>
      <Text style={styles.packageDescription}>{packageData.description}</Text>
      
      <View style={styles.featuresContainer}>
        {packageData.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderConsultationHistory = () => (
    <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
      {consultationHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#888" />
          <Text style={styles.emptyStateTitle}>No Consultations Yet</Text>
          <Text style={styles.emptyStateText}>Book your first expert consultation to get started</Text>
        </View>
      ) : (
        consultationHistory.map((consultation) => (
          <View key={consultation.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{consultation.title}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: consultation.status === 'confirmed' ? '#4caf50' : '#ff9800' }
              ]}>
                <Text style={styles.statusText}>{consultation.status}</Text>
              </View>
            </View>
            <Text style={styles.historyDescription} numberOfLines={2}>
              {consultation.description}
            </Text>
            <View style={styles.historyFooter}>
              <Text style={styles.historyDate}>
                {new Date(consultation.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.historyContext}>{consultation.regulatory_context}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Book Consultation</Text>
          <TouchableOpacity onPress={() => setShowBookingModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {selectedConsultant && (
            <View style={styles.selectedConsultantInfo}>
              <Text style={styles.selectedConsultantName}>{selectedConsultant.name}</Text>
              <Text style={styles.selectedConsultantTitle}>{selectedConsultant.title}</Text>
            </View>
          )}

          {/* Package Selection */}
          <Text style={styles.sectionTitle}>Select Package</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
            {Object.entries(packages).map(([packageId, packageData]) =>
              renderPackageCard(packageId, packageData)
            )}
          </ScrollView>

          {/* Booking Form */}
          <Text style={styles.sectionTitle}>Consultation Details</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Consultation Title *"
            placeholderTextColor="#888"
            value={bookingForm.title}
            onChangeText={(text) => setBookingForm({...bookingForm, title: text})}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your consultation needs *"
            placeholderTextColor="#888"
            value={bookingForm.description}
            onChangeText={(text) => setBookingForm({...bookingForm, description: text})}
            multiline
            numberOfLines={4}
          />

          <View style={styles.dateTimeContainer}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Date (YYYY-MM-DD) *"
              placeholderTextColor="#888"
              value={bookingForm.preferred_date}
              onChangeText={(text) => setBookingForm({...bookingForm, preferred_date: text})}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Time (HH:MM) *"
              placeholderTextColor="#888"
              value={bookingForm.preferred_time}
              onChangeText={(text) => setBookingForm({...bookingForm, preferred_time: text})}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Your Email *"
            placeholderTextColor="#888"
            value={bookingForm.contact_email}
            onChangeText={(text) => setBookingForm({...bookingForm, contact_email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Company Name"
            placeholderTextColor="#888"
            value={bookingForm.company_name}
            onChangeText={(text) => setBookingForm({...bookingForm, company_name: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#888"
            value={bookingForm.phone_number}
            onChangeText={(text) => setBookingForm({...bookingForm, phone_number: text})}
            keyboardType="phone-pad"
          />

          {/* Urgency Level */}
          <Text style={styles.sectionTitle}>Urgency Level</Text>
          <View style={styles.urgencyContainer}>
            {URGENCY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.urgencyOption,
                  bookingForm.urgency_level === level.value && { borderColor: level.color }
                ]}
                onPress={() => setBookingForm({...bookingForm, urgency_level: level.value})}
              >
                <View style={[styles.urgencyDot, { backgroundColor: level.color }]} />
                <Text style={styles.urgencyText}>{level.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Regulatory Context */}
          <Text style={styles.sectionTitle}>Regulatory Context</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {REGULATORY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.regulatoryChip,
                  bookingForm.regulatory_context === option.value && styles.selectedRegulatory
                ]}
                onPress={() => setBookingForm({...bookingForm, regulatory_context: option.value})}
              >
                <Text style={[
                  styles.regulatoryText,
                  bookingForm.regulatory_context === option.value && styles.selectedRegulatoryText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.bookNowButton, loading && styles.disabledButton]}
            onPress={handleBookConsultation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#fff" />
                <Text style={styles.bookNowText}>
                  Book & Pay ${selectedPackage ? packages[selectedPackage]?.price : 0}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderConsultantModal = () => (
    <Modal
      visible={showConsultantModal}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Consultant Profile</Text>
          <TouchableOpacity onPress={() => setShowConsultantModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {selectedConsultant && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.consultantDetailHeader}>
              <View style={styles.consultantDetailAvatar}>
                <Ionicons name="person" size={48} color="#4a90e2" />
              </View>
              <View style={styles.consultantDetailInfo}>
                <Text style={styles.consultantDetailName}>{selectedConsultant.name}</Text>
                <Text style={styles.consultantDetailTitle}>{selectedConsultant.title}</Text>
                {renderRating(selectedConsultant.rating)}
                <Text style={styles.consultantDetailRate}>${selectedConsultant.hourly_rate}/hour</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>About</Text>
            <Text style={styles.consultantDetailBio}>{selectedConsultant.bio}</Text>

            <Text style={styles.detailSectionTitle}>Expertise Areas</Text>
            <View style={styles.expertiseDetailContainer}>
              {selectedConsultant.expertise_areas.map((area, index) => (
                <View key={index} style={styles.expertiseDetailChip}>
                  <Text style={styles.expertiseDetailText}>{area}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.detailSectionTitle}>Education</Text>
            {selectedConsultant.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Ionicons name="school" size={16} color="#4a90e2" />
                <Text style={styles.educationText}>{edu}</Text>
              </View>
            ))}

            <Text style={styles.detailSectionTitle}>Certifications</Text>
            {selectedConsultant.certifications.map((cert, index) => (
              <View key={index} style={styles.certificationItem}>
                <Ionicons name="ribbon" size={16} color="#4caf50" />
                <Text style={styles.certificationText}>{cert}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.bookFromDetailButton}
              onPress={() => {
                setShowConsultantModal(false);
                setShowBookingModal(true);
              }}
            >
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.bookFromDetailText}>Book Consultation</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderPaymentStatusModal = () => (
    <Modal
      visible={showPaymentStatus}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.paymentModalOverlay}>
        <View style={styles.paymentModalContent}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.paymentModalTitle}>Processing Payment</Text>
          <Text style={styles.paymentModalText}>Please wait while we verify your payment...</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Ionicons name="search" size={20} color={activeTab === 'browse' ? '#4a90e2' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse Experts
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time" size={20} color={activeTab === 'history' ? '#4a90e2' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            My Consultations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'browse' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Expert Pharmaceutical Consultants</Text>
            <Text style={styles.headerSubtitle}>
              Connect with industry experts for specialized guidance
            </Text>
          </View>

          {consultants.map(renderConsultantCard)}
        </ScrollView>
      )}

      {activeTab === 'history' && renderConsultationHistory()}

      {renderBookingModal()}
      {renderConsultantModal()}
      {renderPaymentStatusModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#2a2a3e',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#4a90e2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  consultantCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  consultantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  consultantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  consultantInfo: {
    flex: 1,
  },
  consultantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  consultantTitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  consultantStats: {
    alignItems: 'flex-end',
  },
  statText: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    color: '#ffa726',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  consultantBio: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  expertiseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  expertiseChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  expertiseText: {
    color: '#4a90e2',
    fontSize: 12,
  },
  consultantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  historyDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    color: '#888',
    fontSize: 12,
  },
  historyContext: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectedConsultantInfo: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedConsultantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedConsultantTitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
  },
  packagesScroll: {
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 240,
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  selectedPackageCard: {
    borderColor: '#4a90e2',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  packagePrice: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  packageDuration: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  packageDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
  },
  urgencyContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 14,
  },
  regulatoryChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  selectedRegulatory: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  regulatoryText: {
    color: '#ccc',
    fontSize: 14,
  },
  selectedRegulatoryText: {
    color: '#fff',
    fontWeight: '500',
  },
  bookNowButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  bookNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  consultantDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  consultantDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  consultantDetailInfo: {
    flex: 1,
  },
  consultantDetailName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  consultantDetailTitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
  },
  consultantDetailRate: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  detailSectionTitle: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 24,
  },
  consultantDetailBio: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  expertiseDetailContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  expertiseDetailChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  expertiseDetailText: {
    color: '#4a90e2',
    fontSize: 14,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  educationText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  certificationText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  bookFromDetailButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
    marginBottom: 20,
  },
  bookFromDetailText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  paymentModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  paymentModalText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
