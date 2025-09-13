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
  Image,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ImageAnalysisResult {
  id: string;
  image_data: string;
  analysis_type: string;
  description?: string;
  regulatory_context: string;
  analysis_results: { [key: string]: any };
  recommendations: string[];
  quality_score?: number;
  compliance_issues: string[];
  created_at: string;
}

interface AnalysisType {
  name: string;
  description: string;
  focus_areas: string[];
}

const REGULATORY_OPTIONS = [
  { label: 'GMP', value: 'GMP' },
  { label: 'USFDA', value: 'USFDA' },
  { label: 'ICH', value: 'ICH' },
  { label: 'EDQM', value: 'EDQM' },
  { label: 'PMDA', value: 'PMDA' }
];

export default function VisualAnalysis() {
  const [activeTab, setActiveTab] = useState<'capture' | 'history'>('capture');
  const [analysisTypes, setAnalysisTypes] = useState<{ [key: string]: AnalysisType }>({});
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedRegulatory, setSelectedRegulatory] = useState('GMP');
  const [loading, setLoading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<ImageAnalysisResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [currentResult, setCurrentResult] = useState<ImageAnalysisResult | null>(null);

  useEffect(() => {
    loadAnalysisTypes();
    loadAnalysisHistory();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to use this feature.');
    }
  };

  const loadAnalysisTypes = async () => {
    try {
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/image-analysis/types`);
      setAnalysisTypes(response.data);
      // Set first analysis type as default
      const firstType = Object.keys(response.data)[0];
      if (firstType) setSelectedAnalysisType(firstType);
    } catch (error) {
      console.error('Failed to load analysis types:', error);
      Alert.alert('Error', 'Failed to load analysis types.');
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('pharma_user_id') || 'default_user';
      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/image-analysis/history/${userId}`);
      setAnalysisHistory(response.data);
    } catch (error) {
      console.error('Failed to load analysis history:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage || !selectedAnalysisType) {
      Alert.alert('Error', 'Please select an image and analysis type.');
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('pharma_user_id') || 'default_user';
      
      const analysisRequest = {
        image_data: selectedImage,
        analysis_type: selectedAnalysisType,
        description: description.trim() || undefined,
        regulatory_context: selectedRegulatory,
        user_id: userId
      };

      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/image-analysis`, analysisRequest);
      
      setCurrentResult(response.data);
      setShowResults(true);
      loadAnalysisHistory(); // Refresh history
    } catch (error) {
      console.error('Image analysis error:', error);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score?: number) => {
    if (!score) return '#888';
    if (score >= 8) return '#4caf50';
    if (score >= 6) return '#ffa726';
    if (score >= 4) return '#ff9800';
    return '#f44336';
  };

  const getQualityLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  };

  const renderAnalysisTypeCard = (typeId: string, typeData: AnalysisType) => (
    <TouchableOpacity
      key={typeId}
      style={[
        styles.analysisTypeCard,
        selectedAnalysisType === typeId && styles.selectedAnalysisTypeCard
      ]}
      onPress={() => setSelectedAnalysisType(typeId)}
    >
      <View style={styles.analysisTypeHeader}>
        <Ionicons 
          name="checkmark-circle" 
          size={20} 
          color={selectedAnalysisType === typeId ? '#4a90e2' : '#888'} 
        />
        <Text style={[
          styles.analysisTypeName,
          selectedAnalysisType === typeId && styles.selectedAnalysisTypeName
        ]}>
          {typeData.name}
        </Text>
      </View>
      <Text style={styles.analysisTypeDescription}>{typeData.description}</Text>
      <View style={styles.focusAreasContainer}>
        {typeData.focus_areas.slice(0, 2).map((area, index) => (
          <Text key={index} style={styles.focusArea}>• {area}</Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderResults = () => {
    if (!currentResult) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Analysis Results</Text>
        
        {/* Quality Score */}
        {currentResult.quality_score && (
          <View style={styles.qualityScoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreNumber, { color: getQualityColor(currentResult.quality_score) }]}>
                {currentResult.quality_score}
              </Text>
              <Text style={styles.scoreLabel}>Quality Score</Text>
            </View>
            <View style={styles.scoreDetails}>
              <Text style={[styles.scoreStatus, { color: getQualityColor(currentResult.quality_score) }]}>
                {getQualityLabel(currentResult.quality_score)}
              </Text>
              <Text style={styles.analysisTypeLabel}>{analysisTypes[currentResult.analysis_type]?.name}</Text>
            </View>
          </View>
        )}

        {/* AI Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <Text style={styles.analysisText}>
            {currentResult.analysis_results.ai_analysis || 'Analysis completed successfully.'}
          </Text>
        </View>

        {/* Recommendations */}
        {currentResult.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {currentResult.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="bulb" size={16} color="#ffa726" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Compliance Issues */}
        {currentResult.compliance_issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compliance Issues</Text>
            {currentResult.compliance_issues.map((issue, index) => (
              <View key={index} style={styles.complianceItem}>
                <Ionicons name="warning" size={16} color="#f44336" />
                <Text style={styles.complianceText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Regulatory Context */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulatory Context</Text>
          <Text style={styles.regulatoryContext}>{currentResult.regulatory_context}</Text>
        </View>
      </View>
    );
  };

  const renderHistoryCard = (result: ImageAnalysisResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.historyCard}
      onPress={() => {
        setCurrentResult(result);
        setShowResults(true);
      }}
    >
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>{analysisTypes[result.analysis_type]?.name || result.analysis_type}</Text>
        {result.quality_score && (
          <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(result.quality_score) }]}>
            <Text style={styles.qualityBadgeText}>{result.quality_score}/10</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.historyDescription} numberOfLines={2}>
        {result.description || 'No description provided'}
      </Text>
      
      <View style={styles.historyFooter}>
        <Text style={styles.historyDate}>
          {new Date(result.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.historyContext}>{result.regulatory_context}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'capture' && styles.activeTab]}
          onPress={() => setActiveTab('capture')}
        >
          <Ionicons name="camera" size={20} color={activeTab === 'capture' ? '#4a90e2' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'capture' && styles.activeTabText]}>
            Analyze Image
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons name="time" size={20} color={activeTab === 'history' ? '#4a90e2' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Analysis History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'capture' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="scan" size={32} color="#4a90e2" />
            <Text style={styles.headerTitle}>Visual Quality Analysis</Text>
            <Text style={styles.headerSubtitle}>
              AI-powered analysis of pharmaceutical images and documents
            </Text>
          </View>

          {/* Image Selection */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Select Image</Text>
            
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#f44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerContainer}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color="#4a90e2" />
                  <Text style={styles.imagePickerText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <Ionicons name="images" size={32} color="#4a90e2" />
                  <Text style={styles.imagePickerText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Analysis Type Selection */}
          <View style={styles.analysisTypesSection}>
            <Text style={styles.sectionTitle}>Analysis Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(analysisTypes).map(([typeId, typeData]) =>
                renderAnalysisTypeCard(typeId, typeData)
              )}
            </ScrollView>
          </View>

          {/* Description Input */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you want to analyze or any specific concerns..."
              placeholderTextColor="#888"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Regulatory Context */}
          <View style={styles.regulatorySection}>
            <Text style={styles.sectionTitle}>Regulatory Context</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REGULATORY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.regulatoryChip,
                    selectedRegulatory === option.value && styles.selectedRegulatoryChip
                  ]}
                  onPress={() => setSelectedRegulatory(option.value)}
                >
                  <Text style={[
                    styles.regulatoryChipText,
                    selectedRegulatory === option.value && styles.selectedRegulatoryChipText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.disabledButton]}
            onPress={analyzeImage}
            disabled={loading || !selectedImage}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="#fff" />
                <Text style={styles.analyzeButtonText}>Analyze Image</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
          {analysisHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color="#888" />
              <Text style={styles.emptyStateTitle}>No Analysis History</Text>
              <Text style={styles.emptyStateText}>
                Start analyzing pharmaceutical images to build your history
              </Text>
            </View>
          ) : (
            analysisHistory.map(renderHistoryCard)
          )}
        </ScrollView>
      )}

      {/* Results Modal */}
      <Modal
        visible={showResults}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Analysis Results</Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {renderResults()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    alignItems: 'center',
    paddingVertical: 24,
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
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#2a2a3e',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imagePickerButton: {
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4a90e2',
    borderStyle: 'dashed',
    minWidth: 120,
  },
  imagePickerText: {
    color: '#4a90e2',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  analysisTypesSection: {
    marginBottom: 24,
  },
  analysisTypeCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#3a3a4e',
  },
  selectedAnalysisTypeCard: {
    borderColor: '#4a90e2',
    backgroundColor: '#1e2a4a',
  },
  analysisTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisTypeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  selectedAnalysisTypeName: {
    color: '#4a90e2',
  },
  analysisTypeDescription: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  focusAreasContainer: {
    marginTop: 4,
  },
  focusArea: {
    color: '#888',
    fontSize: 11,
    lineHeight: 14,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  regulatorySection: {
    marginBottom: 24,
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
  selectedRegulatoryChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  regulatoryChipText: {
    color: '#ccc',
    fontSize: 14,
  },
  selectedRegulatoryChipText: {
    color: '#fff',
    fontWeight: '500',
  },
  analyzeButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  disabledButton: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    paddingHorizontal: 32,
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
  },
  resultsContainer: {
    paddingVertical: 16,
  },
  resultsTitle: {
    color: '#4a90e2',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  qualityScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  scoreCircle: {
    alignItems: 'center',
    marginRight: 20,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  scoreDetails: {
    flex: 1,
  },
  scoreStatus: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  analysisTypeLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  analysisText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  complianceText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  regulatoryContext: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '500',
  },
});
