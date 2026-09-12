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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../../../src/api/expenses';
import { formatINR } from '../../../src/utils/formatting';
import { ExpenseUpdate } from '../../../src/types/expense';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const res = await expensesApi.getExpense(id);
      if (res.data) {
        setAmount(String(res.data.amount));
        setDescription(res.data.description);
        setMerchant(res.data.merchant || '');
        setNotes(res.data.notes || '');
      }
      return res.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (updateData: ExpenseUpdate) => expensesApi.updateExpense(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      setIsEditing(false);
      Alert.alert('Success', 'Expense updated successfully');
    },
    onError: (err: any) => {
      Alert.alert('Update Failed', err.message || 'Could not update expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Delete Failed', err.message || 'Could not delete expense');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleSaveUpdate = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Description cannot be empty.');
      return;
    }

    updateMutation.mutate({
      amount: parsedAmount,
      description: description.trim(),
      merchant: merchant.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-danger font-bold text-lg mb-2">Expense Not Found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text">
          {isEditing ? 'Edit Expense' : 'Expense Details'}
        </Text>
        <TouchableOpacity
          onPress={() => (isEditing ? handleSaveUpdate() : setIsEditing(true))}
          className="p-1"
        >
          <Text className="text-primary font-bold text-sm">
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Amount Card */}
        <View className="bg-card rounded-2xl p-6 mb-4 border border-border items-center">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: data.category?.color ? `${data.category.color}20` : '#25253e' }}
          >
            <Text className="text-3xl">{data.category?.icon || '📦'}</Text>
          </View>

          {isEditing ? (
            <View className="flex-row items-center justify-center my-2">
              <Text className="text-3xl font-bold text-primary mr-1">₹</Text>
              <TextInput
                className="text-3xl font-bold text-text text-center border-b border-primary px-2"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          ) : (
            <Text className="text-3xl font-bold text-text my-2">
              {formatINR(Number(data.amount))}
            </Text>
          )}

          <Text className="text-textSecondary text-sm font-semibold">
            {data.category?.name || 'General'}
          </Text>
        </View>

        {/* Details List */}
        <View className="bg-card rounded-2xl p-4 mb-4 border border-border space-y-3">
          {/* Description */}
          <View className="border-b border-border pb-3">
            <Text className="text-textSecondary text-xs font-semibold uppercase mb-1">
              Description
            </Text>
            {isEditing ? (
              <TextInput
                className="text-text text-base border-b border-border py-1"
                value={description}
                onChangeText={setDescription}
              />
            ) : (
              <Text className="text-text text-base font-medium">{data.description}</Text>
            )}
          </View>

          {/* Date */}
          <View className="border-b border-border pb-3 pt-1 flex-row justify-between items-center">
            <Text className="text-textSecondary text-xs font-semibold uppercase">Date</Text>
            <Text className="text-text text-sm font-medium">{data.expense_date}</Text>
          </View>

          {/* Payment Method */}
          <View className="border-b border-border pb-3 pt-1 flex-row justify-between items-center">
            <Text className="text-textSecondary text-xs font-semibold uppercase">Payment Method</Text>
            <View className="bg-elevated px-2.5 py-1 rounded-md">
              <Text className="text-primary text-xs font-bold">{data.payment_method}</Text>
            </View>
          </View>

          {/* Merchant */}
          <View className="border-b border-border pb-3 pt-1">
            <Text className="text-textSecondary text-xs font-semibold uppercase mb-1">
              Merchant
            </Text>
            {isEditing ? (
              <TextInput
                className="text-text text-sm border-b border-border py-1"
                placeholder="Merchant name"
                placeholderTextColor="#6b7280"
                value={merchant}
                onChangeText={setMerchant}
              />
            ) : (
              <Text className="text-text text-sm">
                {data.merchant || 'None specified'}
              </Text>
            )}
          </View>

          {/* Notes */}
          <View className="pt-1">
            <Text className="text-textSecondary text-xs font-semibold uppercase mb-1">Notes</Text>
            {isEditing ? (
              <TextInput
                className="text-text text-sm border-b border-border py-1"
                placeholder="Add notes..."
                placeholderTextColor="#6b7280"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            ) : (
              <Text className="text-textSecondary text-sm">
                {data.notes || 'No notes added'}
              </Text>
            )}
          </View>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          className="bg-danger/10 border border-danger/30 rounded-xl py-4 items-center mb-10 flex-row justify-center space-x-2"
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator color="#FF6B6B" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text className="text-danger font-bold text-base ml-2">Delete Expense</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
