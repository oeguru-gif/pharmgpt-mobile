import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  regulatory_context?: string;
  process_type?: string;
}

interface ChatResponse {
  response: string;
  session_id: string;
  suggestions?: string[];
}

const REGULATORY_OPTIONS = [
  { label: 'GMP Standards', value: 'GMP' },
  { label: 'ISO Standards', value: 'ISO' },
  { label: 'USFDA Requirements', value: 'USFDA' },
  { label: 'KFDA Requirements', value: 'KFDA' },
  { label: 'EDQM Standards', value: 'EDQM' },
  { label: 'PMDA Requirements', value: 'PMDA' }
];

const PROCESS_TYPES = [
  { label: 'Batch Failure Analysis', value: 'batch_failure' },
  { label: 'Process Optimization', value: 'process_optimization' },
  { label: 'Contamination Investigation', value: 'contamination_investigation' },
  { label: 'Equipment Troubleshooting', value: 'equipment_troubleshooting' },
  { label: 'Quality Control Issues', value: 'quality_control' },
  { label: 'Regulatory Document Review', value: 'regulatory_proofreading' }
];

const PROOFREADING_PROMPTS = [
  {
    title: "Misleading Information Check",
    prompt: "Is there any misleading information in this document?",
    icon: "alert-circle",
    category: "accuracy"
  },
  {
    title: "Regulatory Compliance Review",
    prompt: "Review this section of our regulatory submission and provide suggestions for improving clarity and compliance",
    icon: "checkmark-circle",
    category: "compliance"
  },
  {
    title: "Inconsistencies & Errors",
    prompt: "Help us identify any potential inconsistencies or errors in this document.",
    icon: "search",
    category: "accuracy"
  },
  {
    title: "Language Consistency",
    prompt: "Is there any inconsistent language in this document?",
    icon: "text",
    category: "language"
  },
  {
    title: "Regulatory Requirements Summary",
    prompt: "Summarize the key regulatory requirements for this product and provide a concise overview.",
    icon: "list",
    category: "summary"
  },
  {
    title: "References Generation",
    prompt: "Generate a comprehensive list of references to support the efficacy and safety claims in our submission.",
    icon: "library",
    category: "references"
  },
  {
    title: "Labeling Optimization",
    prompt: "We need to optimize the labeling information for this drug. Can you assist with drafting clear and compliant language?",
    icon: "pricetag",
    category: "labeling"
  },
  {
    title: "Clinical Data Review",
    prompt: "Review our clinical trial data and ensure that it aligns with regulatory guidelines and standards.",
    icon: "analytics",
    category: "clinical"
  },
  {
    title: "Regulatory Updates",
    prompt: "Interpret the latest regulatory updates and incorporate them into our submission.",
    icon: "refresh",
    category: "updates"
  },
  {
    title: "Risk Management Enhancement",
    prompt: "Suggest ways to strengthen the risk management section of our regulatory documentation.",
    icon: "shield",
    category: "risk"
  }
];

export default function PharmaAIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [selectedRegulatory, setSelectedRegulatory] = useState('GMP');
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProofreadingPrompts, setShowProofreadingPrompts] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeSession();
    loadChatHistory();
  }, []);

  const initializeSession = async () => {
    try {
      let storedSessionId = await AsyncStorage.getItem('pharma_session_id');
      if (!storedSessionId) {
        storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('pharma_session_id', storedSessionId);
      }
      setSessionId(storedSessionId);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const storedSessionId = await AsyncStorage.getItem('pharma_session_id');
      if (storedSessionId) {
        const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/chat-history/${storedSessionId}`);
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: textToSend,
      sender: 'user',
      timestamp: new Date().toISOString(),
      regulatory_context: selectedRegulatory,
      process_type: selectedProcess || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setShowProofreadingPrompts(false);
    Keyboard.dismiss();

    try {
      const response = await axios.post<ChatResponse>(`${EXPO_PUBLIC_BACKEND_URL}/api/chat`, {
        message: textToSend,
        session_id: sessionId,
        regulatory_context: selectedRegulatory,
        process_type: selectedProcess
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: response.data.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        regulatory_context: selectedRegulatory,
        process_type: selectedProcess || undefined
      };

      setMessages(prev => [...prev, aiMessage]);
      setSuggestions(response.data.suggestions || []);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
    setSuggestions([]);
  };

  const handleProofreadingPromptPress = (prompt: string) => {
    sendMessage(prompt);
  };

  const clearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            setSuggestions([]);
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => (
    <View key={message.id} style={[
      styles.messageContainer,
      message.sender === 'user' ? styles.userMessage : styles.assistantMessage
    ]}>
      <View style={[
        styles.messageBubble,
        message.sender === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.sender === 'user' ? styles.userText : styles.assistantText
        ]}>
          {message.message}
        </Text>
        <Text style={[
          styles.timestamp,
          message.sender === 'user' ? styles.userTimestamp : styles.assistantTimestamp
        ]}>
          {formatTimestamp(message.timestamp)}
        </Text>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingsHeader}>
        <Text style={styles.settingsTitle}>Assistant Settings</Text>
        <TouchableOpacity onPress={() => setShowSettings(false)}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.settingsLabel}>Regulatory Context</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
        {REGULATORY_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionChip,
              selectedRegulatory === option.value && styles.selectedChip
            ]}
            onPress={() => setSelectedRegulatory(option.value)}
          >
            <Text style={[
              styles.optionText,
              selectedRegulatory === option.value && styles.selectedText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.settingsLabel}>Process Focus (Optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
        <TouchableOpacity
          style={[
            styles.optionChip,
            !selectedProcess && styles.selectedChip
          ]}
          onPress={() => setSelectedProcess(null)}
        >
          <Text style={[
            styles.optionText,
            !selectedProcess && styles.selectedText
          ]}>
            General
          </Text>
        </TouchableOpacity>
        {PROCESS_TYPES.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionChip,
              selectedProcess === option.value && styles.selectedChip
            ]}
            onPress={() => setSelectedProcess(option.value)}
          >
            <Text style={[
              styles.optionText,
              selectedProcess === option.value && styles.selectedText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProofreadingPrompts = () => (
    <View style={styles.proofreaderContainer}>
      <View style={styles.proofreaderHeader}>
        <View style={styles.proofreaderTitleContainer}>
          <Ionicons name="document-text" size={24} color="#4a90e2" />
          <Text style={styles.proofreaderTitle}>Regulatory Proofreading</Text>
        </View>
        <TouchableOpacity onPress={() => setShowProofreadingPrompts(false)}>
          <Ionicons name="chevron-down" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.proofreaderSubtitle}>
        Quick access to pharmaceutical document review prompts
      </Text>

      <ScrollView style={styles.promptsGrid} showsVerticalScrollIndicator={false}>
        {PROOFREADING_PROMPTS.map((promptItem, index) => (
          <TouchableOpacity
            key={index}
            style={styles.promptCard}
            onPress={() => handleProofreadingPromptPress(promptItem.prompt)}
          >
            <View style={styles.promptHeader}>
              <Ionicons name={promptItem.icon as any} size={20} color="#4a90e2" />
              <Text style={styles.promptTitle}>{promptItem.title}</Text>
            </View>
            <Text style={styles.promptText} numberOfLines={3}>
              {promptItem.prompt}
            </Text>
            <View style={styles.promptFooter}>
              <Text style={styles.promptCategory}>{promptItem.category}</Text>
              <Ionicons name="arrow-forward" size={16} color="#888" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flask" size={24} color="#4a90e2" />
          <Text style={styles.headerTitle}>PharmaGPT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowProofreadingPrompts(!showProofreadingPrompts)} 
            style={[styles.headerButton, showProofreadingPrompts && styles.activeHeaderButton]}
          >
            <Ionicons name="document-text" size={20} color={showProofreadingPrompts ? "#fff" : "#4a90e2"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={20} color="#4a90e2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color="#4a90e2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Context Indicator */}
      <View style={styles.contextIndicator}>
        <Text style={styles.contextText}>
          {selectedRegulatory} {selectedProcess && `• ${PROCESS_TYPES.find(p => p.value === selectedProcess)?.label}`}
        </Text>
      </View>

      {/* Settings Panel */}
      {showSettings && renderSettings()}

      {/* Proofreading Prompts Panel */}
      {showProofreadingPrompts && renderProofreadingPrompts()}

      {/* Chat Messages */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <Ionicons name="flask" size={48} color="#4a90e2" />
              <Text style={styles.welcomeTitle}>Welcome to PharmaGPT</Text>
              <Text style={styles.welcomeSubtitle}>
                Your AI assistant for pharmaceutical quality, R&D, and regulatory compliance
              </Text>
              
              {/* Quick Start Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => setShowProofreadingPrompts(true)}
                >
                  <Ionicons name="document-text" size={20} color="#4a90e2" />
                  <Text style={styles.quickActionText}>Document Review</Text>
                </TouchableOpacity>
                
                {/* Navigate to Investigation Tools */}
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => Alert.alert('Info', 'Use the Investigation tab at the bottom for 5-Why, Fishbone, and CAPA analysis tools.')}
                >
                  <Ionicons name="search" size={20} color="#4a90e2" />
                  <Text style={styles.quickActionText}>Investigation Tools</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.exampleQuestions}>
                <Text style={styles.exampleTitle}>Try asking:</Text>
                <TouchableOpacity 
                  style={styles.exampleItem}
                  onPress={() => setInputText("My batch failed during crystallization. How should I investigate?")}
                >
                  <Text style={styles.exampleText}>• My batch failed during crystallization. How should I investigate?</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exampleItem}
                  onPress={() => setInputText("What are the GMP requirements for API manufacturing equipment?")}
                >
                  <Text style={styles.exampleText}>• What are the GMP requirements for API manufacturing equipment?</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exampleItem}
                  onPress={() => setInputText("How can I optimize my synthesis process for better yield?")}
                >
                  <Text style={styles.exampleText}>• How can I optimize my synthesis process for better yield?</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4a90e2" />
              <Text style={styles.loadingText}>PharmaGPT is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.suggestionsContainer}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about pharma processes, regulations, troubleshooting..."
            placeholderTextColor="#888"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color={(!inputText.trim() || loading) ? "#888" : "#4a90e2"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  activeHeaderButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 6,
  },
  contextIndicator: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  contextText: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: '500',
  },
  settingsContainer: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  optionsScroll: {
    marginBottom: 8,
  },
  optionChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  selectedChip: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  optionText: {
    color: '#ccc',
    fontSize: 12,
  },
  selectedText: {
    color: '#fff',
    fontWeight: '500',
  },
  proofreaderContainer: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    maxHeight: 400,
  },
  proofreaderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proofreaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proofreaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  proofreaderSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  promptsGrid: {
    maxHeight: 280,
  },
  promptCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  promptTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  promptText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptCategory: {
    color: '#4a90e2',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 16,
  },
  quickActionButton: {
    backgroundColor: '#2a2a3e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  quickActionText: {
    color: '#4a90e2',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  exampleQuestions: {
    marginTop: 32,
    alignSelf: 'stretch',
  },
  exampleTitle: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  exampleItem: {
    marginBottom: 8,
  },
  exampleText: {
    color: '#4a90e2',
    fontSize: 14,
    lineHeight: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#4a90e2',
  },
  assistantBubble: {
    backgroundColor: '#2a2a3e',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantTimestamp: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 14,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionChip: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  suggestionText: {
    color: '#4a90e2',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    padding: 12,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
