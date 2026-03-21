import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  category: string;
  subcategory: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Person {
  id: string;
  name: string;
}

interface CategoryGroup {
  category: string;
  total_tasks: number;
  completed_tasks: number;
  tasks: Task[];
}

export default function TasksScreen() {
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'pending' | 'completed'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    category: '',
    subcategory: '',
  });

  useEffect(() => {
    fetchTasks(true); // Initial load with loading spinner
    fetchTaskCategories();
    fetchPersons();

    // Auto-refresh every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchTasks(false); // Background refresh without loading spinner
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/persons`);
      const data = await response.json();
      setPersons(data);
    } catch (error) {
      console.error('Error fetching persons:', error);
    }
  };

  const fetchTaskCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/task-categories`);
      const data = await response.json();
      setTaskCategories(data.categories);
    } catch (error) {
      console.error('Error fetching task categories:', error);
    }
  };

  const fetchTasks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/tasks`);
      const data = await response.json();
      setTaskData(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (showLoading) Alert.alert('Error', 'Failed to load tasks');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.assigned_to) {
      Alert.alert('Error', 'Please fill in title and assign to someone');
      return;
    }

    try {
      const url = editingTask
        ? `${BACKEND_URL}/api/tasks/${editingTask.id}`
        : `${BACKEND_URL}/api/tasks`;
      
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchTasks();
      } else {
        Alert.alert('Error', 'Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Failed to save task');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}/toggle`, {
        method: 'PATCH',
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchTasks();
              }
            } catch (error) {
              console.error('Error deleting task:', error);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    resetForm();
    setEditingTask(null);
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      category: task.category || '',
      subcategory: task.subcategory || '',
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      category: '',
      subcategory: '',
    });
  };

  const selectCategory = (category: string) => {
    setFormData({ ...formData, category });
    setCategoryModalVisible(false);
  };

  const selectPerson = (personName: string) => {
    setFormData({ ...formData, assigned_to: personName });
    setPersonModalVisible(false);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const groupByCategory = (): CategoryGroup[] => {
    if (!taskData?.tasks) return [];
    
    const filteredTasks = getFilteredTasks();
    const groups: { [key: string]: CategoryGroup } = {};
    
    // Add "Uncategorized" for tasks without category
    groups['Uncategorized'] = {
      category: 'Uncategorized',
      total_tasks: 0,
      completed_tasks: 0,
      tasks: [],
    };

    filteredTasks.forEach((task: Task) => {
      const category = task.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = {
          category,
          total_tasks: 0,
          completed_tasks: 0,
          tasks: [],
        };
      }
      groups[category].total_tasks += 1;
      if (task.completed) {
        groups[category].completed_tasks += 1;
      }
      groups[category].tasks.push(task);
    });

    return Object.values(groups).filter(group => group.tasks.length > 0);
  };

  const getFilteredTasks = () => {
    if (!taskData?.tasks) return [];
    
    switch (filterCompleted) {
      case 'completed':
        return taskData.tasks.filter((task: Task) => task.completed);
      case 'pending':
        return taskData.tasks.filter((task: Task) => !task.completed);
      default:
        return taskData.tasks;
    }
  };

  const renderProgressCircle = () => {
    const percentage = taskData?.total_tasks
      ? (taskData.completed_tasks / taskData.total_tasks) * 100
      : 0;
    
    return (
      <View style={styles.progressCircle}>
        <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
        <Text style={styles.progressLabel}>Complete</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  const categoryGroups = groupByCategory();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Task Progress</Text>
          <View style={styles.summaryContent}>
            {renderProgressCircle()}
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{taskData?.total_tasks || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.completedNumber]}>
                  {taskData?.completed_tasks || 0}
                </Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.pendingNumber]}>
                  {taskData?.pending_tasks || 0}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterCompleted === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterCompleted('all')}
          >
            <Text style={[styles.filterButtonText, filterCompleted === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterCompleted === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilterCompleted('pending')}
          >
            <Text style={[styles.filterButtonText, filterCompleted === 'pending' && styles.filterButtonTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterCompleted === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilterCompleted('completed')}
          >
            <Text style={[styles.filterButtonText, filterCompleted === 'completed' && styles.filterButtonTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks by Category</Text>
          {categoryGroups.length > 0 ? (
            categoryGroups.map((group) => (
              <View key={group.category} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(group.category)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <Ionicons
                      name={expandedCategories.has(group.category) ? 'chevron-down' : 'chevron-forward'}
                      size={24}
                      color="#FF69B4"
                    />
                    <View>
                      <Text style={styles.categoryTitle}>{group.category}</Text>
                      <Text style={styles.categorySubtitle}>
                        {group.completed_tasks} of {group.total_tasks} completed
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryProgress}>
                    <Text style={styles.categoryProgressText}>
                      {group.total_tasks > 0
                        ? Math.round((group.completed_tasks / group.total_tasks) * 100)
                        : 0}%
                    </Text>
                  </View>
                </TouchableOpacity>

                {expandedCategories.has(group.category) && (
                  <View style={styles.tasksContainer}>
                    {group.tasks.map((task) => (
                      <View key={task.id} style={styles.taskItem}>
                        <TouchableOpacity
                          style={styles.taskCheckbox}
                          onPress={() => handleToggleTask(task.id)}
                        >
                          <Ionicons
                            name={task.completed ? 'checkbox' : 'square-outline'}
                            size={28}
                            color={task.completed ? '#FF69B4' : '#CCC'}
                          />
                        </TouchableOpacity>
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                            {task.title}
                          </Text>
                          {task.subcategory ? (
                            <Text style={styles.taskSubcategory}>
                              <Ionicons name="bookmark-outline" size={12} /> {task.subcategory}
                            </Text>
                          ) : null}
                          {task.description ? (
                            <Text style={styles.taskDescription}>{task.description}</Text>
                          ) : null}
                          <View style={styles.taskFooter}>
                            <View style={styles.assignedContainer}>
                              <Ionicons name="person" size={14} color="#FF69B4" />
                              <Text style={styles.assignedText}>{task.assigned_to}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.taskActions}>
                          <TouchableOpacity onPress={() => openEditModal(task)} style={styles.iconButton}>
                            <Ionicons name="pencil" size={20} color="#FF69B4" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(task.id)} style={styles.iconButton}>
                            <Ionicons name="trash" size={20} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkbox-outline" size={64} color="#FFB6C1" />
              <Text style={styles.emptyStateText}>
                {filterCompleted === 'all' ? 'No tasks yet' : `No ${filterCompleted} tasks`}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {filterCompleted === 'all'
                  ? 'Tap the + button to add your first task'
                  : 'Try changing the filter'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Task Modal */}
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
              <Text style={styles.modalTitle}>{editingTask ? 'Edit' : 'Add'} Task</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FF69B4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Task Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="What needs to be done?"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={formData.category ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
                  {formData.category || 'Select Category (Optional)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#FF69B4" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Subcategory</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Marriage Hall, Pre-wedding shoot"
                value={formData.subcategory}
                onChangeText={(text) => setFormData({ ...formData, subcategory: text })}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add details..."
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.inputLabel}>Assigned To *</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setPersonModalVisible(true)}
              >
                <Text style={formData.assigned_to ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
                  {formData.assigned_to || 'Select Person'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#FF69B4" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>{editingTask ? 'Update' : 'Add'} Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.categoryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FF69B4" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {taskCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => selectCategory(category)}
                >
                  <Text style={styles.categoryItemText}>{category}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFB6C1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Person Modal */}
      <Modal
        visible={personModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPersonModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.categoryModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign To</Text>
              <TouchableOpacity onPress={() => setPersonModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FF69B4" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {persons.length > 0 ? (
                persons.map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.categoryItem}
                    onPress={() => selectPerson(person.name)}
                  >
                    <Text style={styles.categoryItemText}>{person.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#FFB6C1" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noPersons}>
                  <Text style={styles.noPersonsText}>No family members added yet</Text>
                  <Text style={styles.noPersonsSubtext}>Go to Family tab to add family members</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F7' },
  scrollView: { flex: 1 },
  summaryCard: { backgroundColor: '#FFF', margin: 16, padding: 20, borderRadius: 16, shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF69B4', marginBottom: 16, textAlign: 'center' },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  progressCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFE4E1',
    justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FF69B4' },
  progressPercentage: { fontSize: 24, fontWeight: 'bold', color: '#FF69B4' },
  progressLabel: { fontSize: 12, color: '#666' },
  summaryStats: { flexDirection: 'row', gap: 20 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  completedNumber: { color: '#4CAF50' },
  pendingNumber: { color: '#FFA500' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE4E1', alignItems: 'center' },
  filterButtonActive: { backgroundColor: '#FF69B4', borderColor: '#FF69B4' },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  filterButtonTextActive: { color: '#FFF' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  categoryCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 12 },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  categoryTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  categorySubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  categoryProgress: { backgroundColor: '#FFE4E1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  categoryProgressText: { fontSize: 14, fontWeight: '600', color: '#FF69B4' },
  tasksContainer: { backgroundColor: '#FFF5F7', paddingTop: 8 },
  taskItem: { backgroundColor: '#FFF', padding: 16, marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start' },
  taskCheckbox: { paddingRight: 12, paddingTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  taskTitleCompleted: { textDecorationLine: 'line-through', color: '#999' },
  taskSubcategory: { fontSize: 12, color: '#FF69B4', marginBottom: 4 },
  taskDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  taskFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  assignedContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F5',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  assignedText: { fontSize: 12, color: '#FF69B4', marginLeft: 4, fontWeight: '500' },
  taskActions: { flexDirection: 'column', gap: 8, marginLeft: 8 },
  iconButton: { padding: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#FFB6C1', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#CCC', marginTop: 8, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF69B4', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#FFE4E1' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF69B4' },
  modalForm: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#FFF5F7', borderWidth: 1, borderColor: '#FFE4E1', borderRadius: 12,
    padding: 12, fontSize: 16, color: '#333' },
  textArea: { height: 80, textAlignVertical: 'top' },
  categorySelector: { backgroundColor: '#FFF5F7', borderWidth: 1, borderColor: '#FFE4E1',
    borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categorySelectorText: { fontSize: 16, color: '#333' },
  categorySelectorPlaceholder: { fontSize: 16, color: '#999' },
  submitButton: { backgroundColor: '#FF69B4', padding: 16, borderRadius: 12, alignItems: 'center',
    marginTop: 24, marginBottom: 8 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  categoryModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  categoryList: { padding: 20 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#FFE4E1' },
  categoryItemText: { fontSize: 16, color: '#333' },
  noPersons: { padding: 32, alignItems: 'center' },
  noPersonsText: { fontSize: 14, fontWeight: '600', color: '#999', textAlign: 'center' },
  noPersonsSubtext: { fontSize: 12, color: '#CCC', marginTop: 8, textAlign: 'center' },
});
