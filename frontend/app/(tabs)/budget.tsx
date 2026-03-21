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

interface BudgetItem {
  id: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  notes: string;
  is_custom: boolean;
}

interface BudgetSummary {
  total_budgeted: number;
  total_spent: number;
  remaining: number;
  items: BudgetItem[];
}

export default function BudgetScreen() {
  const [budgetData, setBudgetData] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [predefinedCategories, setPredefinedCategories] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    category: '',
    budgeted_amount: '',
    spent_amount: '',
    notes: '',
    is_custom: false,
  });

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/budget-categories`);
      const data = await response.json();
      setPredefinedCategories(data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/budgets`);
      const data = await response.json();
      setBudgetData(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      Alert.alert('Error', 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.budgeted_amount) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const url = editingItem
        ? `${BACKEND_URL}/api/budgets/${editingItem.id}`
        : `${BACKEND_URL}/api/budgets`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: formData.category,
          budgeted_amount: parseFloat(formData.budgeted_amount) || 0,
          spent_amount: parseFloat(formData.spent_amount) || 0,
          notes: formData.notes,
          is_custom: formData.is_custom,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchBudgets();
      } else {
        Alert.alert('Error', 'Failed to save budget item');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget item');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Budget Item',
      'Are you sure you want to delete this budget item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/budgets/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchBudgets();
              }
            } catch (error) {
              console.error('Error deleting budget:', error);
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    resetForm();
    setEditingItem(null);
    setModalVisible(true);
  };

  const openEditModal = (item: BudgetItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      budgeted_amount: item.budgeted_amount.toString(),
      spent_amount: item.spent_amount.toString(),
      notes: item.notes,
      is_custom: item.is_custom,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      budgeted_amount: '',
      spent_amount: '',
      notes: '',
      is_custom: false,
    });
  };

  const selectCategory = (category: string) => {
    setFormData({ ...formData, category, is_custom: false });
    setCategoryModalVisible(false);
  };

  const addCustomCategory = () => {
    Alert.prompt(
      'Custom Category',
      'Enter category name',
      (text) => {
        if (text) {
          setFormData({ ...formData, category: text, is_custom: true });
          setCategoryModalVisible(false);
        }
      }
    );
  };

  const renderProgressBar = (spent: number, budgeted: number) => {
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    const clampedPercentage = Math.min(percentage, 100);
    
    return (
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${clampedPercentage}%`,
              backgroundColor: percentage > 100 ? '#FF6B6B' : percentage > 80 ? '#FFA500' : '#FF69B4',
            },
          ]}
        />
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Wedding Budget Overview</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Budget</Text>
              <Text style={styles.summaryAmount}>${budgetData?.total_budgeted.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={[styles.summaryAmount, styles.spentAmount]}>
                ${budgetData?.total_spent.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingLabel}>Remaining</Text>
            <Text style={[
              styles.remainingAmount,
              (budgetData?.remaining || 0) < 0 && styles.overBudget
            ]}>
              ${budgetData?.remaining.toFixed(2) || '0.00'}
            </Text>
          </View>
          {renderProgressBar(budgetData?.total_spent || 0, budgetData?.total_budgeted || 0)}
        </View>

        {/* Budget Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Items</Text>
          {budgetData?.items && budgetData.items.length > 0 ? (
            budgetData.items.map((item) => (
              <View key={item.id} style={styles.budgetItem}>
                <View style={styles.budgetItemHeader}>
                  <View style={styles.budgetItemTitleRow}>
                    <Ionicons name="pricetag" size={20} color="#FF69B4" />
                    <Text style={styles.budgetItemTitle}>{item.category}</Text>
                    {item.is_custom && (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>Custom</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.budgetItemActions}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconButton}>
                      <Ionicons name="pencil" size={20} color="#FF69B4" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
                      <Ionicons name="trash" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.budgetItemAmounts}>
                  <Text style={styles.budgetItemLabel}>Budgeted: ${item.budgeted_amount.toFixed(2)}</Text>
                  <Text style={styles.budgetItemLabel}>Spent: ${item.spent_amount.toFixed(2)}</Text>
                </View>
                {renderProgressBar(item.spent_amount, item.budgeted_amount)}
                {item.notes ? <Text style={styles.budgetItemNotes}>{item.notes}</Text> : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#FFB6C1" />
              <Text style={styles.emptyStateText}>No budget items yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap the + button to add your first budget item</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
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
              <Text style={styles.modalTitle}>{editingItem ? 'Edit' : 'Add'} Budget Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FF69B4" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={formData.category ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
                  {formData.category || 'Select Category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#FF69B4" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Budgeted Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={formData.budgeted_amount}
                onChangeText={(text) => setFormData({ ...formData, budgeted_amount: text })}
              />

              <Text style={styles.inputLabel}>Spent Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={formData.spent_amount}
                onChangeText={(text) => setFormData({ ...formData, spent_amount: text })}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add notes..."
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>{editingItem ? 'Update' : 'Add'} Budget Item</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Selection Modal */}
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
              {predefinedCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryItem}
                  onPress={() => selectCategory(category)}
                >
                  <Text style={styles.categoryItemText}>{category}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFB6C1" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.categoryItem, styles.customCategoryItem]}
                onPress={addCustomCategory}
              >
                <Ionicons name="add-circle" size={24} color="#FF69B4" />
                <Text style={[styles.categoryItemText, styles.customCategoryText]}>Add Custom Category</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  spentAmount: {
    color: '#FF69B4',
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFE4E1',
  },
  remainingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  remainingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  overBudget: {
    color: '#FF6B6B',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#FFE4E1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  budgetItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  customBadge: {
    backgroundColor: '#FFE4E1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  customBadgeText: {
    fontSize: 10,
    color: '#FF69B4',
    fontWeight: '600',
  },
  budgetItemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  budgetItemAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetItemLabel: {
    fontSize: 14,
    color: '#666',
  },
  budgetItemNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    maxHeight: '90%',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    backgroundColor: '#FFF5F7',
    borderWidth: 1,
    borderColor: '#FFE4E1',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  categorySelectorPlaceholder: {
    fontSize: 16,
    color: '#999',
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
  categoryModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  categoryList: {
    padding: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E1',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  customCategoryItem: {
    borderBottomWidth: 0,
    marginTop: 8,
    backgroundColor: '#FFF5F7',
    borderRadius: 12,
  },
  customCategoryText: {
    color: '#FF69B4',
    fontWeight: '600',
    marginLeft: 8,
  },
});
