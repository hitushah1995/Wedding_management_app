import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Person {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export default function FamilyScreen() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    relation: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchPersons(true); // Initial load with loading spinner

    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchPersons(false); // Background refresh without loading spinner
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchPersons = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/persons`);
      const data = await response.json();
      setPersons(data);
    } catch (error) {
      console.error('Error fetching persons:', error);
      if (showLoading) Alert.alert('Error', 'Failed to load family members');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter name');
      return;
    }

    try {
      const url = editingPerson
        ? `${BACKEND_URL}/api/persons/${editingPerson.id}`
        : `${BACKEND_URL}/api/persons`;
      
      const method = editingPerson ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchPersons();
      } else {
        Alert.alert('Error', 'Failed to save family member');
      }
    } catch (error) {
      console.error('Error saving person:', error);
      Alert.alert('Error', 'Failed to save family member');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Family Member',
      'Are you sure you want to delete this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/persons/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchPersons();
              }
            } catch (error) {
              console.error('Error deleting person:', error);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    resetForm();
    setEditingPerson(null);
    setModalVisible(true);
  };

  const openEditModal = (person: Person) => {
    setEditingPerson(person);
    setFormData({
      name: person.name,
      relation: person.relation,
      phone: person.phone,
      email: person.email,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relation: '',
      phone: '',
      email: '',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family Members</Text>
          <Text style={styles.headerSubtitle}>
            Manage family members for task assignments and expense tracking
          </Text>
        </View>

        <View style={styles.section}>
          {persons.length > 0 ? (
            persons.map((person) => (
              <View key={person.id} style={styles.personCard}>
                <View style={styles.personIcon}>
                  <Ionicons name="person" size={24} color="#FF69B4" />
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{person.name}</Text>
                  {person.relation ? (
                    <Text style={styles.personRelation}>{person.relation}</Text>
                  ) : null}
                  {person.phone ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={14} color="#666" />
                      <Text style={styles.contactText}>{person.phone}</Text>
                    </View>
                  ) : null}
                  {person.email ? (
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={14} color="#666" />
                      <Text style={styles.contactText}>{person.email}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.personActions}>
                  <TouchableOpacity onPress={() => openEditModal(person)} style={styles.iconButton}>
                    <Ionicons name="pencil" size={20} color="#FF69B4" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(person.id)} style={styles.iconButton}>
                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#FFB6C1" />
              <Text style={styles.emptyStateText}>No family members yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add family members to easily assign tasks and track expenses
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPerson ? 'Edit' : 'Add'} Family Member
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FF69B4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Relation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Groom, Bride, Father, Mother"
                value={formData.relation}
                onChangeText={(text) => setFormData({ ...formData, relation: text })}
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {editingPerson ? 'Update' : 'Add'} Family Member
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  personCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  personIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  personRelation: {
    fontSize: 14,
    color: '#FF69B4',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  personActions: {
    flexDirection: 'column',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFB6C1',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFF5F7',
    borderWidth: 1,
    borderColor: '#FFE4E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#FF69B4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
