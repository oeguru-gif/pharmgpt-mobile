import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface GreenChemistryAnalysis {
  id: string;
  process_description: string;
  current_solvents: string[];
  e_factor: number | null;
  sustainability_score: number | null;
  recommendations: string[];
  alternative_solvents: string[];
  green_metrics: { [key: string]: string };
  created_at: string;
}

const GREEN_CHEMISTRY_PRINCIPLES = [
  'Prevent waste',
  'Design safer chemicals',
  'Design less hazardous synthesis',
  'Use renewable feedstocks',
  'Use catalysts',
  'Avoid chemical derivatives',
  'Maximize atom economy',
  'Use safer solvents',
  'Increase energy efficiency',
  'Design for degradation',
  'Real-time monitoring',
  'Prevent accidents'
];

const COMMON_SOLVENTS = [
  'Dichloromethane (DCM)',
  'Methanol',
  'Ethanol',
  'Acetone',
  'Toluene',
  'Hexane',
  'Ethyl acetate',
  'DMF',
  'DMSO',
  'THF',
  'Chloroform',
  'Water'
];

export default function GreenChemistry() {
  const [processDescription, setProcessDescription] = useState('');
  const [currentSolvents, setCurrentSolvents] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<GreenChemistryAnalysis | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showSolventPicker, setShowSolventPicker] = useState(false);
  const [activeSolventIndex, setActiveSolventIndex] = useState(0);

  const getUserId = async () => {
    try {
      let userId = await AsyncStorage.getItem('pharma_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('pharma_user_id', userId);
      }
      return userId;
    } catch (error) {
      return 'default_user';
    }
  };

  const addSolvent = () => {
    setCurrentSolvents([...currentSolvents, '']);
  };

  const updateSolvent = (index: number, value: string) => {
    const updated = [...currentSolvents];
    updated[index] = value;
    setCurrentSolvents(updated);
  };

  const removeSolvent = (index: number) => {
    if (currentSolvents.length > 1) {
      const updated = currentSolvents.filter((_, i) => i !== index);
      setCurrentSolvents(updated);
    }
  };

  const openSolventPicker = (index: number) => {
    setActiveSolventIndex(index);
    setShowSolventPicker(true);
  };

  const selectSolvent = (solvent: string) => {
    updateSolvent(activeSolventIndex, solvent);
    setShowSolventPicker(false);
  };

  const analyzeGreenChemistry = async () => {
    if (!processDescription.trim()) {
      Alert.alert('Error', 'Please describe your process');
      return;
    }

    const validSolvents = currentSolvents.filter(solvent => solvent.trim());
    if (validSolvents.length === 0) {
      Alert.alert('Error', 'Please enter at least one solvent');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/green-chemistry/analyze`, {
        process_description: processDescription,
        current_solvents: validSolvents,
        user_id: userId,
        target_metrics: ['E-factor', 'Atom Economy', 'Solvent Reduction']
      });

      setAnalysis(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Green chemistry analysis error:', error);
      Alert.alert('Error', 'Failed to analyze green chemistry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSustainabilityColor = (score: number | null) => {
    if (!score) return '#888';
    if (score >= 8) return '#4caf50';
    if (score >= 6) return '#ffa726';
    if (score >= 4) return '#ff9800';
    return '#f44336';
  };

  const getSustainabilityLabel = (score: number | null) => {
    if (!score) return 'Unknown';
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Improvement';
  };

  const renderResults = () => {
    if (!analysis) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Green Chemistry Analysis</Text>
        
        {/* Sustainability Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: getSustainabilityColor(analysis.sustainability_score) }]}>
              {analysis.sustainability_score || '?'}
            </Text>
            <Text style={styles.scoreLabel}>Sustainability Score</Text>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={[styles.scoreStatus, { color: getSustainabilityColor(analysis.sustainability_score) }]}>
              {getSustainabilityLabel(analysis.sustainability_score)}
            </Text>
            {analysis.e_factor && (
              <Text style={styles.eFactor}>E-Factor: {analysis.e_factor.toFixed(2)}</Text>
            )}
          </View>
        </View>

        {/* Process Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Process Analyzed</Text>
          <Text style={styles.sectionContent}>{analysis.process_description}</Text>
        </View>

        {/* Current Solvents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Solvents</Text>
          <View style={styles.solventsList}>
            {analysis.current_solvents.map((solvent, index) => (
              <View key={index} style={styles.solventChip}>
                <Text style={styles.solventText}>{solvent}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Green Chemistry Recommendations</Text>
          {analysis.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons name="leaf" size={16} color="#4caf50" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* Alternative Solvents */}
        {analysis.alternative_solvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alternative Solvents</Text>
            {analysis.alternative_solvents.map((alt, index) => (
              <Text key={index} style={styles.alternativeItem}>• {alt}</Text>
            ))}
          </View>
        )}

        {/* Green Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Green Metrics Assessment</Text>
          {Object.entries(analysis.green_metrics).map(([metric, value]) => (
            <View key={metric} style={styles.metricItem}>
              <Text style={styles.metricName}>{metric}:</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="leaf" size={32} color="#4caf50" />
          <Text style={styles.headerTitle}>Green Chemistry Advisor</Text>
          <Text style={styles.headerSubtitle}>
            Optimize your pharmaceutical processes for sustainability
          </Text>
        </View>

        {/* Process Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Process Description</Text>
          <TextInput
            style={styles.textInput}
            value={processDescription}
            onChangeText={setProcessDescription}
            placeholder="Describe your pharmaceutical process, synthesis route, or manufacturing step..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Current Solvents Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Solvents Used</Text>
          {currentSolvents.map((solvent, index) => (
            <View key={index} style={styles.solventInputContainer}>
              <TouchableOpacity
                style={[styles.textInput, styles.solventInput]}
                onPress={() => openSolventPicker(index)}
              >
                <Text style={[styles.solventInputText, !solvent && styles.placeholderText]}>
                  {solvent || `Select solvent ${index + 1}...`}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
              {currentSolvents.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeSolvent(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addSolvent}>
            <Ionicons name="add-circle" size={20} color="#4caf50" />
            <Text style={styles.addButtonText}>Add Solvent</Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.disabledButton]}
          onPress={analyzeGreenChemistry}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={styles.analyzeButtonText}>Analyze Green Chemistry</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Green Chemistry Principles */}
        <View style={styles.principlesContainer}>
          <Text style={styles.principlesTitle}>12 Principles of Green Chemistry</Text>
          <View style={styles.principlesGrid}>
            {GREEN_CHEMISTRY_PRINCIPLES.map((principle, index) => (
              <View key={index} style={styles.principleItem}>
                <Text style={styles.principleNumber}>{index + 1}</Text>
                <Text style={styles.principleText}>{principle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#4caf50" />
          <Text style={styles.infoText}>
            Green Chemistry focuses on reducing environmental impact through sustainable processes, 
            safer solvents, and improved atom economy. Our AI analyzes your process against industry 
            best practices and regulatory guidelines.
          </Text>
        </View>
      </ScrollView>

      {/* Solvent Picker Modal */}
      <Modal
        visible={showSolventPicker}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Solvent</Text>
            <TouchableOpacity onPress={() => setShowSolventPicker(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {COMMON_SOLVENTS.map((solvent, index) => (
              <TouchableOpacity
                key={index}
                style={styles.solventOption}
                onPress={() => selectSolvent(solvent)}
              >
                <Text style={styles.solventOptionText}>{solvent}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.customSolventButton}
              onPress={() => {
                setShowSolventPicker(false);
                // You could add a text input modal here for custom solvents
              }}
            >
              <Ionicons name="create" size={20} color="#4a90e2" />
              <Text style={styles.customSolventText}>Enter Custom Solvent</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  solventInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  solventInput: {
    flex: 1,
    minHeight: 50,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  solventInputText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  addButtonText: {
    color: '#4caf50',
    fontSize: 16,
    marginLeft: 8,
  },
  analyzeButton: {
    backgroundColor: '#4caf50',
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
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  principlesContainer: {
    marginBottom: 24,
  },
  principlesTitle: {
    color: '#4caf50',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  principlesGrid: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  principleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  principleNumber: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  principleText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
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
  solventOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    marginVertical: 4,
  },
  solventOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  customSolventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  customSolventText: {
    color: '#4a90e2',
    fontSize: 16,
    marginLeft: 8,
  },
  resultsContainer: {
    paddingVertical: 16,
  },
  resultsTitle: {
    color: '#4caf50',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
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
  eFactor: {
    color: '#ccc',
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  solventsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  solventChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  solventText: {
    color: '#4a90e2',
    fontSize: 12,
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
  alternativeItem: {
    color: '#4caf50',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  metricItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metricName: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 120,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
});
