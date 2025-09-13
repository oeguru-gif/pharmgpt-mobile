import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#1a1a2e" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4a90e2',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: {
            backgroundColor: '#1a1a2e',
            borderTopColor: '#2a2a3e',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: '#1a1a2e',
            borderBottomColor: '#2a2a3e',
            borderBottomWidth: 1,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'AI Chat',
            headerTitle: 'PharmaGPT Assistant',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-ellipses" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="visual-analysis"
          options={{
            title: 'Vision',
            headerTitle: 'Visual Quality Analysis',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="investigation"
          options={{
            title: 'Investigation',
            headerTitle: 'Investigation Tools',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="green-chemistry"
          options={{
            title: 'Green Chem',
            headerTitle: 'Green Chemistry Advisor',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="leaf" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="consultations"
          options={{
            title: 'Experts',
            headerTitle: 'Expert Consultations',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
            tabBarBadge: 'Premium',
            tabBarBadgeStyle: {
              backgroundColor: '#ff6b35',
              color: '#fff',
              fontSize: 10,
              minWidth: 50,
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerTitle: 'User Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
