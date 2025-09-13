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

interface FiveWhyAnalysis {
  id: string;
  problem_statement: string;
  whys: string[];
  root_cause: string | null;
  recommendations: string[];
  regulatory_context: string;
  created_at: string;
}

interface FishboneAnalysis {
  id: string;
  problem_statement: string;
  categories: { [key: string]: string[] };
  root_causes: string[];
  regulatory_context: string;
  created_at: string;
}

interface CAPAAnalysis {
  id: string;
  problem_statement: string;
  root_causes: string[];
  corrective_actions: string[];
  preventive_actions: string[];
  regulatory_requirements: string[];
  timeline: string | null;
  responsible_parties: string[];
  created_at: string;
}

const REGULATORY_OPTIONS = [
  { label: 'GMP', value: 'GMP' },
  { label: 'USFDA', value: 'USFDA' },
  { label: 'ICH', value: 'ICH' },
  { label: 'EDQM', value: 'EDQM' },
  { label: 'PMDA', value: 'PMDA' }
];

export default function Investigation() {
  const [activeTab, setActiveTab] = useState<'5why' | 'fishbone' | 'capa'>('5why');
  const [loading, setLoading] = useState(false);
  const [problemStatement, setProblemStatement] = useState('');
  const [selectedRegulatory, setSelectedRegulatory] = useState('GMP');
  const [rootCauses, setRootCauses] = useState<string[]>(['']);
  const [results, setResults] = useState<{
    fiveWhy: FiveWhyAnalysis | null;
    fishbone: FishboneAnalysis | null;
    capa: CAPAAnalysis | null;
  }>({
    fiveWhy: null,
    fishbone: null,
    capa: null
  });
  const [showResults, setShowResults] = useState(false);

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

  const generate5WhyAnalysis = async () => {
    if (!problemStatement.trim()) {
      Alert.alert('Error', 'Please enter a problem statement');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/investigation/five-why`, {
        problem_statement: problemStatement,
        user_id: userId,
        regulatory_context: selectedRegulatory
      });

      setResults(prev => ({ ...prev, fiveWhy: response.data }));
      setShowResults(true);
    } catch (error) {
      console.error('5-Why analysis error:', error);
      Alert.alert('Error', 'Failed to generate 5-Why analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateFishboneAnalysis = async () => {
    if (!problemStatement.trim()) {
      Alert.alert('Error', 'Please enter a problem statement');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/investigation/fishbone`, {
        problem_statement: problemStatement,
        user_id: userId,
        regulatory_context: selectedRegulatory
      });

      setResults(prev => ({ ...prev, fishbone: response.data }));
      setShowResults(true);
    } catch (error) {
      console.error('Fishbone analysis error:', error);
      Alert.alert('Error', 'Failed to generate Fishbone analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCAPAAnalysis = async () => {
    if (!problemStatement.trim()) {
      Alert.alert('Error', 'Please enter a problem statement');
      return;
    }

    const validRootCauses = rootCauses.filter(cause => cause.trim());
    if (validRootCauses.length === 0) {
      Alert.alert('Error', 'Please enter at least one root cause');
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/investigation/capa`, {
        problem_statement: problemStatement,
        root_causes: validRootCauses,
        user_id: userId,
        regulatory_context: selectedRegulatory
      });

      setResults(prev => ({ ...prev, capa: response.data }));
      setShowResults(true);
    } catch (error) {
      console.error('CAPA analysis error:', error);
      Alert.alert('Error', 'Failed to generate CAPA analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addRootCause = () => {
    setRootCauses([...rootCauses, '']);
  };

  const updateRootCause = (index: number, value: string) => {
    const updated = [...rootCauses];
    updated[index] = value;
    setRootCauses(updated);
  };

  const removeRootCause = (index: number) => {
    if (rootCauses.length > 1) {
      const updated = rootCauses.filter((_, i) => i !== index);
      setRootCauses(updated);
    }
  };

  const renderTabButton = (tab: '5why' | 'fishbone' | 'capa', title: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#4a90e2' : '#888'} 
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const render5WhyResults = () => {
    if (!results.fiveWhy) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>5-Why Analysis Results</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Statement</Text>
          <Text style={styles.sectionContent}>{results.fiveWhy.problem_statement}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progressive Analysis</Text>
          {results.fiveWhy.whys.map((why, index) => (
            <Text key={index} style={styles.whyItem}>{why}</Text>
          ))}
        </View>

        {results.fiveWhy.root_cause && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Root Cause</Text>
            <Text style={styles.rootCause}>{results.fiveWhy.root_cause}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {results.fiveWhy.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationItem}>{rec}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderFishboneResults = () => {
    if (!results.fishbone) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Fishbone Analysis Results</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Statement</Text>
          <Text style={styles.sectionContent}>{results.fishbone.problem_statement}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cause Categories</Text>
          {Object.entries(results.fishbone.categories).map(([category, causes]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {causes.map((cause, index) => (
                <Text key={index} style={styles.causeItem}>• {cause}</Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Likely Root Causes</Text>
          {results.fishbone.root_causes.map((cause, index) => (
            <Text key={index} style={styles.rootCauseItem}>{cause}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderCAPAResults = () => {
    if (!results.capa) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>CAPA Analysis Results</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Statement</Text>
          <Text style={styles.sectionContent}>{results.capa.problem_statement}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Corrective Actions</Text>
          {results.capa.corrective_actions.map((action, index) => (
            <Text key={index} style={styles.actionItem}>{action}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preventive Actions</Text>
          {results.capa.preventive_actions.map((action, index) => (
            <Text key={index} style={styles.actionItem}>{action}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulatory Requirements</Text>
          {results.capa.regulatory_requirements.map((req, index) => (
            <Text key={index} style={styles.reqItem}>• {req}</Text>
          ))}
        </View>

        {results.capa.timeline && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <Text style={styles.sectionContent}>{results.capa.timeline}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responsible Parties</Text>
          {results.capa.responsible_parties.map((party, index) => (
            <Text key={index} style={styles.partyItem}>• {party}</Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        {renderTabButton('5why', '5-Why', 'help-circle')}
        {renderTabButton('fishbone', 'Fishbone', 'analytics')}
        {renderTabButton('capa', 'CAPA', 'construct')}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Regulatory Context Selector */}
        <View style={styles.regulatoryContainer}>
          <Text style={styles.label}>Regulatory Context</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {REGULATORY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.regulatoryChip,
                  selectedRegulatory === option.value && styles.selectedChip
                ]}
                onPress={() => setSelectedRegulatory(option.value)}
              >
                <Text style={[
                  styles.chipText,
                  selectedRegulatory === option.value && styles.selectedChipText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Problem Statement Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Problem Statement</Text>
          <TextInput
            style={styles.textInput}
            value={problemStatement}
            onChangeText={setProblemStatement}
            placeholder="Describe the pharmaceutical problem or issue..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* CAPA-specific Root Causes Input */}
        {activeTab === 'capa' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Root Causes</Text>
            {rootCauses.map((cause, index) => (
              <View key={index} style={styles.rootCauseInputContainer}>
                <TextInput
                  style={[styles.textInput, styles.rootCauseInput]}
                  value={cause}
                  onChangeText={(value) => updateRootCause(index, value)}
                  placeholder={`Root cause ${index + 1}...`}
                  placeholderTextColor="#888"
                />
                {rootCauses.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeRootCause(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addRootCause}>
              <Ionicons name="add-circle" size={20} color="#4a90e2" />
              <Text style={styles.addButtonText}>Add Root Cause</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.disabledButton]}
          onPress={() => {
            if (activeTab === '5why') generate5WhyAnalysis();
            else if (activeTab === 'fishbone') generateFishboneAnalysis();
            else generateCAPAAnalysis();
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>
                Generate {activeTab === '5why' ? '5-Why' : activeTab === 'fishbone' ? 'Fishbone' : 'CAPA'} Analysis
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Tool Descriptions */}
        <View style={styles.descriptionContainer}>
          {activeTab === '5why' && (
            <View style={styles.toolDescription}>
              <Ionicons name="information-circle" size={20} color="#4a90e2" />
              <Text style={styles.descriptionText}>
                5-Why Analysis systematically asks "why" five times to drill down to the root cause of a problem.
              </Text>
            </View>
          )}
          {activeTab === 'fishbone' && (
            <View style={styles.toolDescription}>
              <Ionicons name="information-circle" size={20} color="#4a90e2" />
              <Text style={styles.descriptionText}>
                Fishbone (Ishikawa) Diagram categorizes potential causes into Materials, Methods, Machines, Manpower, Measurement, and Environment.
              </Text>
            </View>
          )}
          {activeTab === 'capa' && (
            <View style={styles.toolDescription}>
              <Ionicons name="information-circle" size={20} color="#4a90e2" />
              <Text style={styles.descriptionText}>
                CAPA (Corrective and Preventive Actions) generates comprehensive action plans with regulatory compliance considerations.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
            {activeTab === '5why' && render5WhyResults()}
            {activeTab === 'fishbone' && renderFishboneResults()}
            {activeTab === 'capa' && renderCAPAResults()}
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
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#2a2a3e',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#4a90e2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  regulatoryContainer: {
    marginVertical: 16,
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
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
  inputContainer: {
    marginBottom: 20,
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
  rootCauseInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rootCauseInput: {
    flex: 1,
    minHeight: 50,
    marginRight: 8,
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
    color: '#4a90e2',
    fontSize: 16,
    marginLeft: 8,
  },
  generateButton: {
    backgroundColor: '#4a90e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  toolDescription: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  descriptionText: {
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
  section: {
    marginBottom: 24,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  whyItem: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 8,
  },
  rootCause: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  recommendationItem: {
    color: '#4caf50',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  causeItem: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
    marginLeft: 8,
  },
  rootCauseItem: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 6,
  },
  actionItem: {
    color: '#4caf50',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  reqItem: {
    color: '#ffa726',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  partyItem: {
    color: '#90caf9',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
});
