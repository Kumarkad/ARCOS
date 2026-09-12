import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../../src/api/categories';
import { expensesApi } from '../../../src/api/expenses';
import { useOfflineStore } from '../../../src/stores/offlineStore';
import { ExpenseCreate } from '../../../src/types/expense';

const PAYMENT_METHODS = ['UPI', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING'];

export default function AddExpenseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { queueExpense } = useOfflineStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const categories = categoriesData?.data || [];

  // Default to first category when loaded if none selected
  if (categories.length > 0 && !selectedCategoryId) {
    setSelectedCategoryId(categories[0].id);
  }

  const createMutation = useMutation({
    mutationFn: (data: ExpenseCreate) => expensesApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      router.back();
    },
    onError: async (error: any, variables: ExpenseCreate) => {
      // If network error, store in offline queue
      await queueExpense(variables);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      Alert.alert(
        'Offline Entry Saved',
        'Your expense was saved locally and will automatically sync when connection is restored.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
  });

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide a short description for this expense.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }

    const payload: ExpenseCreate = {
      amount: parsedAmount,
      description: description.trim(),
      category_id: selectedCategoryId,
      payment_method: paymentMethod,
      expense_date: expenseDate,
      merchant: merchant.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  const setDateOffset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setExpenseDate(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text">Add Expense</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* Amount Input */}
        <View className="bg-card rounded-2xl p-6 mb-4 border border-border items-center">
          <Text className="text-textSecondary text-xs uppercase tracking-wider mb-2 font-semibold">
            Amount (INR)
          </Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-3xl font-bold text-primary mr-1">₹</Text>
            <TextInput
              className="text-4xl font-bold text-text text-center min-w-[120px]"
              placeholder="0"
              placeholderTextColor="#4b5563"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Description
          </Text>
          <View className="bg-card rounded-xl p-3.5 border border-border">
            <TextInput
              className="text-text text-base"
              placeholder="e.g. Chai, Groceries, Dinner"
              placeholderTextColor="#6b7280"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Category Picker */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Category
          </Text>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    className={`flex-row items-center px-3.5 py-2.5 rounded-xl mr-2 border ${
                      isSelected ? 'bg-primary/20 border-primary' : 'bg-card border-border'
                    }`}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <Text className="text-base mr-1.5">{cat.icon || '📦'}</Text>
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Date Selector */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Date
          </Text>
          <View className="flex-row space-x-2 mb-2">
            <TouchableOpacity
              className={`px-4 py-2 rounded-lg border ${
                expenseDate === todayStr ? 'bg-primary border-primary' : 'bg-card border-border'
              }`}
              onPress={() => setDateOffset(0)}
            >
              <Text
                className={`text-xs font-semibold ${
                  expenseDate === todayStr ? 'text-white' : 'text-textSecondary'
                }`}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-2 rounded-lg border ${
                expenseDate === yesterdayStr ? 'bg-primary border-primary' : 'bg-card border-border'
              }`}
              onPress={() => setDateOffset(1)}
            >
              <Text
                className={`text-xs font-semibold ${
                  expenseDate === yesterdayStr ? 'text-white' : 'text-textSecondary'
                }`}
              >
                Yesterday
              </Text>
            </TouchableOpacity>

            <View className="flex-1 bg-card rounded-lg px-3 py-2 border border-border justify-center">
              <TextInput
                className="text-text text-xs"
                value={expenseDate}
                onChangeText={setExpenseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Payment Method
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = method === paymentMethod;
              return (
                <TouchableOpacity
                  key={method}
                  className={`px-3.5 py-2 rounded-lg mr-2 border ${
                    isSelected ? 'bg-primary border-primary' : 'bg-card border-border'
                  }`}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Merchant (Optional) */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Merchant / Store (Optional)
          </Text>
          <View className="bg-card rounded-xl p-3.5 border border-border">
            <TextInput
              className="text-text text-sm"
              placeholder="e.g. Starbucks, Amazon, Local Kirana"
              placeholderTextColor="#6b7280"
              value={merchant}
              onChangeText={setMerchant}
            />
          </View>
        </View>

        {/* Notes (Optional) */}
        <View className="mb-8">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Notes (Optional)
          </Text>
          <View className="bg-card rounded-xl p-3.5 border border-border">
            <TextInput
              className="text-text text-sm min-h-[60px]"
              placeholder="Additional details..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center mb-10 shadow-lg active:scale-98"
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Save Expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
