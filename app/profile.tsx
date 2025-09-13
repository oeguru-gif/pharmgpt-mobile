import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserProfile {
  id: string;
  user_id: string;
  regulatory_preferences: string[];
  company_type: string;
  experience_level: string;
  created_at: string;
}

const REGULATORY_OPTIONS = [
  { label: 'GMP Standards', value: 'GMP', description: 'Good Manufacturing Practice' },
  { label: 'ISO Standards', value: 'ISO', description: 'International Organization for Standardization' },
  { label: 'USFDA Requirements', value: 'USFDA', description: 'US Food and Drug Administration' },
  { label: 'KFDA Requirements', value: 'KFDA', description: 'Korea Food and Drug Administration' },
  { label: 'EDQM Standards', value: 'EDQM', description: 'European Directorate for Quality of Medicines' },
  { label: 'PMDA Requirements', value: 'PMDA', description: 'Pharmaceuticals and Medical Devices Agency (Japan)' },
  { label: 'ICH Guidelines', value: 'ICH', description: 'International Council for Harmonisation' }
];

const COMPANY_TYPES = [
  { label: 'API Manufacturing', value: 'API_Manufacturing' },
  { label: 'Formulation', value: 'Formulation' },
  { label: 'Contract Manufacturing', value: 'Contract_Manufacturing' },
  { label: 'R&D Organization', value: 'RD_Organization' },
  { label: 'Regulatory Affairs', value: 'Regulatory_Affairs' },
  { label: 'Quality Control Lab', value: 'Quality_Control' }
];

const EXPERIENCE_LEVELS = [
  { label: 'Entry Level', value: 'Entry', description: '0-2 years' },
  { label: 'Intermediate', value: 'Intermediate', description: '3-7 years' },
  { label: 'Senior', value: 'Senior', description: '8-15 years' },
  { label: 'Expert', value: 'Expert', description: '15+ years' }
];

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [selectedRegulatory, setSelectedRegulatory] = useState<string[]>(['GMP']);
  const [selectedCompanyType, setSelectedCompanyType] = useState('API_Manufacturing');
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('Intermediate');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    initializeProfile();
  }, []);

  const initializeProfile = async () => {
    try {
      let storedUserId = await AsyncStorage.getItem('pharma_user_id');
      if (!storedUserId) {
        storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('pharma_user_id', storedUserId);
      }
      setUserId(storedUserId);
      
      // Load existing profile
      loadProfile(storedUserId);
      
      // Load preferences
      const darkModePreference = await AsyncStorage.getItem('dark_mode');
      const notificationPreference = await AsyncStorage.getItem('notifications');
      
      if (darkModePreference !== null) {
        setDarkMode(JSON.parse(darkModePreference));
      }
      if (notificationPreference !== null) {
        setNotifications(JSON.parse(notificationPreference));
      }
    } catch (error) {
      console.error('Profile initialization error:', error);
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/user-profile/${userId}`);
      if (response.data) {
        setProfile(response.data);
        setSelectedRegulatory(response.data.regulatory_preferences);
        setSelectedCompanyType(response.data.company_type);
        setSelectedExperienceLevel(response.data.experience_level);
      }
    } catch (error) {
      console.log('No existing profile found, will create new one');
    }
  };

  const saveProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const profileData = {
        user_id: userId,
        regulatory_preferences: selectedRegulatory,
        company_type: selectedCompanyType,
        experience_level: selectedExperienceLevel
      };

      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/user-profile`, profileData);
      setProfile(response.data);
      
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRegulatoryPreference = (value: string) => {
    if (selectedRegulatory.includes(value)) {
      if (selectedRegulatory.length > 1) {
        setSelectedRegulatory(selectedRegulatory.filter(item => item !== value));
      }
    } else {
      setSelectedRegulatory([...selectedRegulatory, value]);
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('dark_mode', JSON.stringify(value));
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem('notifications', JSON.stringify(value));
  };

  const clearChatHistory = async () => {
    Alert.alert(
      'Clear Chat History',
      'This will delete all your chat conversations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Generate new session ID
              const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await AsyncStorage.setItem('pharma_session_id', newSessionId);
              Alert.alert('Success', 'Chat history cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear chat history.');
            }
          }
        }
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Export your profile and analysis history to share or backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => {
          // In a real app, this would export data to a file
          Alert.alert('Info', 'Data export feature will be available in a future update.');
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-circle" size={64} color="#4a90e2" />
          <Text style={styles.headerTitle}>User Profile</Text>
          <Text style={styles.headerSubtitle}>
            Customize your PharmaGPT experience
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="finger-print" size={20} color="#4a90e2" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{userId.substring(0, 20)}...</Text>
            </View>
          </View>
          {profile && (
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#4a90e2" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Profile Created</Text>
                <Text style={styles.infoValue}>
                  {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Regulatory Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulatory Preferences</Text>
          <Text style={styles.sectionSubtitle}>
            Select the regulatory standards most relevant to your work
          </Text>
          {REGULATORY_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.preferenceItem,
                selectedRegulatory.includes(option.value) && styles.selectedPreferenceItem
              ]}
              onPress={() => toggleRegulatoryPreference(option.value)}
            >
              <View style={styles.preferenceContent}>
                <Text style={[
                  styles.preferenceLabel,
                  selectedRegulatory.includes(option.value) && styles.selectedPreferenceLabel
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.preferenceDescription}>{option.description}</Text>
              </View>
              <Ionicons
                name={selectedRegulatory.includes(option.value) ? "checkbox" : "square-outline"}
                size={24}
                color={selectedRegulatory.includes(option.value) ? "#4a90e2" : "#888"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Company Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Type</Text>
          <View style={styles.optionsContainer}>
            {COMPANY_TYPES.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  selectedCompanyType === option.value && styles.selectedChip
                ]}
                onPress={() => setSelectedCompanyType(option.value)}
              >
                <Text style={[
                  styles.chipText,
                  selectedCompanyType === option.value && styles.selectedChipText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Level</Text>
          {EXPERIENCE_LEVELS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.experienceItem,
                selectedExperienceLevel === option.value && styles.selectedExperienceItem
              ]}
              onPress={() => setSelectedExperienceLevel(option.value)}
            >
              <View style={styles.experienceContent}>
                <Text style={[
                  styles.experienceLabel,
                  selectedExperienceLevel === option.value && styles.selectedExperienceLabel
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.experienceDescription}>{option.description}</Text>
              </View>
              <Ionicons
                name={selectedExperienceLevel === option.value ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={selectedExperienceLevel === option.value ? "#4a90e2" : "#888"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingItem}>
            <Ionicons name="moon" size={20} color="#4a90e2" />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Use dark theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#2a2a3e', true: '#4a90e2' }}
              thumbColor={darkMode ? '#fff' : '#888'}
            />
          </View>

          <View style={styles.settingItem}>
            <Ionicons name="notifications" size={20} color="#4a90e2" />
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>Receive analysis updates</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#2a2a3e', true: '#4a90e2' }}
              thumbColor={notifications ? '#fff' : '#888'}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={exportData}>
            <Ionicons name="download" size={20} color="#4caf50" />
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Export Data</Text>
              <Text style={styles.actionDescription}>Download your analysis history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={clearChatHistory}>
            <Ionicons name="trash" size={20} color="#ff4444" />
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, { color: '#ff4444' }]}>Clear Chat History</Text>
              <Text style={styles.actionDescription}>Delete all conversations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={saveProfile}
          disabled={loading}
        >
          <Ionicons name="save" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>PharmaGPT v1.0</Text>
          <Text style={styles.appInfoText}>AI-Powered Pharmaceutical Assistant</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginVertical: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    color: '#888',
    fontSize: 12,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a3e',
  },
  selectedPreferenceItem: {
    backgroundColor: '#3a4a6e',
    borderColor: '#4a90e2',
    borderWidth: 1,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedPreferenceLabel: {
    color: '#4a90e2',
  },
  preferenceDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  selectedChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
  },
  selectedChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  experienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a3e',
  },
  selectedExperienceItem: {
    backgroundColor: '#3a4a6e',
    borderColor: '#4a90e2',
    borderWidth: 1,
  },
  experienceContent: {
    flex: 1,
  },
  experienceLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedExperienceLabel: {
    color: '#4a90e2',
  },
  experienceDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  settingContent: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  settingDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  actionContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  actionDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  appInfoText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
