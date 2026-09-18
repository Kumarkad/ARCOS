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
import { categoriesApi } from '../../src/api/categories';
import { budgetsApi } from '../../src/api/budgets';
import { BudgetCreate, BudgetCategoryInput } from '../../src/types/budget';

export default function AddBudgetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('Monthly Budget');
  const [totalAmount, setTotalAmount] = useState('');
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, string>>({});

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const categories = categoriesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: BudgetCreate) => budgetsApi.createBudget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Failed to Create Budget', err.message || 'An error occurred');
    },
  });

  const handleCategoryAmountChange = (catId: string, value: string) => {
    setCategoryAllocations((prev) => ({
      ...prev,
      [catId]: value,
    }));
  };

  const handleSave = () => {
    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      Alert.alert('Invalid Total', 'Please enter a valid total budget amount.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please give this budget a name.');
      return;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const categoryInputs: BudgetCategoryInput[] = [];
    for (const [catId, val] of Object.entries(categoryAllocations)) {
      const parsedVal = parseFloat(val);
      if (!isNaN(parsedVal) && parsedVal > 0) {
        categoryInputs.push({
          category_id: catId,
          allocated_amount: parsedVal,
        });
      }
    }

    const payload: BudgetCreate = {
      name: name.trim(),
      total_amount: parsedTotal,
      period,
      start_date: firstDay,
      end_date: lastDay,
      categories: categoryInputs,
    };

    createMutation.mutate(payload);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text">Create Budget</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* Budget Name */}
        <View className="mb-4">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Budget Name
          </Text>
          <View className="bg-card rounded-xl p-3.5 border border-border">
            <TextInput
              className="text-text text-base"
              placeholder="e.g. September Household"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Total Budget Amount */}
        <View className="bg-card rounded-2xl p-6 mb-4 border border-border items-center">
          <Text className="text-textSecondary text-xs uppercase tracking-wider mb-2 font-semibold">
            Total Monthly Limit (INR)
          </Text>
          <View className="flex-row items-center justify-center">
            <Text className="text-3xl font-bold text-primary mr-1">₹</Text>
            <TextInput
              className="text-4xl font-bold text-text text-center min-w-[120px]"
              placeholder="35000"
              placeholderTextColor="#4b5563"
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
            />
          </View>
        </View>

        {/* Period Selector */}
        <View className="mb-5">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-1.5 ml-1">
            Period
          </Text>
          <View className="flex-row bg-card rounded-xl p-1 border border-border">
            {(['MONTHLY', 'WEEKLY', 'YEARLY'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                className={`flex-1 py-2 items-center rounded-lg ${
                  period === p ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    period === p ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Allocations */}
        <View className="mb-8">
          <Text className="text-textSecondary text-xs font-semibold uppercase mb-2 ml-1">
            Set Category Limits (Optional)
          </Text>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            categories.map((cat) => (
              <View
                key={cat.id}
                className="bg-card rounded-xl p-3 mb-2.5 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <Text className="text-xl mr-2.5">{cat.icon || '📦'}</Text>
                  <Text className="text-text font-medium text-sm">{cat.name}</Text>
                </View>
                <View className="flex-row items-center bg-elevated px-3 py-1.5 rounded-lg border border-border/50">
                  <Text className="text-textSecondary text-sm font-bold mr-1">₹</Text>
                  <TextInput
                    className="text-text text-sm font-bold w-20 text-right"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                    value={categoryAllocations[cat.id] || ''}
                    onChangeText={(val) => handleCategoryAmountChange(cat.id, val)}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center mb-10 shadow-lg active:scale-98"
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Save Budget</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
