import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { expensesApi } from '../../../src/api/expenses';
import { categoriesApi } from '../../../src/api/categories';
import { Expense } from '../../../src/types/expense';
import { formatINR } from '../../../src/utils/formatting';
import { useOfflineStore } from '../../../src/stores/offlineStore';

export default function ExpensesScreen() {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { pendingQueue, syncPendingExpenses, isSyncing } = useOfflineStore();

  const {
    data: categoriesData,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const {
    data: expensesData,
    isLoading,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ['expenses', selectedCategoryId],
    queryFn: () =>
      expensesApi.getExpenses({
        category_id: selectedCategoryId || undefined,
        page_size: 50,
      }),
  });

  const categories = categoriesData?.data || [];
  const expenses = expensesData?.data || [];

  const handleRefresh = useCallback(async () => {
    if (pendingQueue.length > 0) {
      await syncPendingExpenses();
    }
    await refetch();
  }, [pendingQueue, syncPendingExpenses, refetch]);

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      className="bg-card rounded-2xl p-4 mb-3 border border-border flex-row items-center justify-between"
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(tabs)/expenses/[id]', params: { id: item.id } })}
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: item.category?.color ? `${item.category.color}20` : '#25253e' }}
        >
          <Text className="text-2xl">{item.category?.icon || '📦'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-text font-bold text-base" numberOfLines={1}>
            {item.description}
          </Text>
          <View className="flex-row items-center mt-1 space-x-2">
            <Text className="text-textSecondary text-xs">
              {item.category?.name || 'General'}
            </Text>
            <Text className="text-muted text-xs">•</Text>
            <Text className="text-textSecondary text-xs">{item.expense_date}</Text>
            <Text className="text-muted text-xs">•</Text>
            <View className="bg-elevated px-1.5 py-0.5 rounded">
              <Text className="text-primary text-[10px] font-semibold">{item.payment_method}</Text>
            </View>
          </View>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-danger font-bold text-base">
          -{formatINR(Number(item.amount))}
        </Text>
        {item.merchant ? (
          <Text className="text-textSecondary text-xs mt-1" numberOfLines={1}>
            {item.merchant}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background relative" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">Expenses</Text>
        {pendingQueue.length > 0 && (
          <TouchableOpacity
            className="flex-row items-center bg-warning/20 px-3 py-1.5 rounded-full"
            onPress={syncPendingExpenses}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFB946" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#FFB946" />
                <Text className="text-warning text-xs font-semibold ml-1.5">
                  Sync {pendingQueue.length}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Pills */}
      <View className="py-2.5">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: '', name: 'All' }, ...categories]}
          keyExtractor={(item) => item.id || 'all'}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => {
            const isSelected = item.id === (selectedCategoryId || '');
            return (
              <TouchableOpacity
                className={`px-4 py-2 rounded-full mr-2 border ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-card border-border'
                }`}
                onPress={() => setSelectedCategoryId(item.id || null)}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Expenses List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="receipt-outline" size={64} color="#6b7280" className="mb-4" />
          <Text className="text-text font-bold text-lg mb-1">No expenses yet</Text>
          <Text className="text-textSecondary text-center text-sm">
            Tap the + button below to log your first expense.
          </Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor="#6C63FF"
              colors={['#6C63FF']}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full justify-center items-center shadow-lg active:scale-95"
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/expenses/add')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
