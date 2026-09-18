import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi } from '../../src/api/budgets';
import { Budget, BudgetCategoryStatus } from '../../src/types/budget';
import { formatINR } from '../../src/utils/formatting';

export default function BudgetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsApi.getBudgets(),
  });

  const budgets = data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetsApi.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Could not delete budget');
    },
  });

  const handleDeleteBudget = (id: string, name: string) => {
    Alert.alert('Delete Budget', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCEEDED':
        return '#FF6B6B';
      case 'WARNING':
        return '#FFB946';
      default:
        return '#00C48C';
    }
  };

  const renderCategoryItem = (cat: BudgetCategoryStatus) => {
    const statusColor = getStatusColor(cat.status);

    return (
      <View key={cat.category_id} className="mt-3 bg-elevated/50 p-3 rounded-xl">
        <View className="flex-row justify-between items-center mb-1.5">
          <View className="flex-row items-center">
            <Text className="text-base mr-2">{cat.category_icon || '📦'}</Text>
            <Text className="text-text font-medium text-sm">{cat.category_name}</Text>
          </View>
          <View className="items-end">
            <Text className="text-text font-bold text-xs">
              {formatINR(Number(cat.spent_amount))} / {formatINR(Number(cat.allocated_amount))}
            </Text>
            <Text className="text-[10px] font-semibold" style={{ color: statusColor }}>
              {cat.utilization_pct}% used
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="h-1.5 w-full bg-background rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(cat.utilization_pct, 100)}%`,
              backgroundColor: statusColor,
            }}
          />
        </View>

        {cat.warning_message ? (
          <Text className="text-[11px] font-medium mt-1.5" style={{ color: statusColor }}>
            {cat.warning_message}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderBudgetItem = ({ item }: { item: Budget }) => {
    const overallColor = getStatusColor(item.overall_status);

    return (
      <View className="bg-card rounded-2xl p-5 mb-4 border border-border">
        {/* Budget Title & Delete Button */}
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1 mr-2">
            <Text className="text-text font-bold text-lg">{item.name}</Text>
            <Text className="text-textSecondary text-xs mt-0.5">
              {item.period} • {item.start_date} to {item.end_date}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteBudget(item.id, item.name)}
            className="p-1.5"
          >
            <Ionicons name="trash-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Total Progress & Numbers */}
        <View className="bg-background rounded-xl p-3.5 mb-3">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-textSecondary text-xs font-semibold">Total Budget Spent</Text>
            <Text className="text-text font-bold text-sm">
              {formatINR(Number(item.total_spent))} / {formatINR(Number(item.total_amount))}
            </Text>
          </View>

          <View className="h-2 w-full bg-elevated rounded-full overflow-hidden mb-1.5">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(item.total_utilization_pct, 100)}%`,
                backgroundColor: overallColor,
              }}
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-xs" style={{ color: overallColor }}>
              {item.total_utilization_pct}% used
            </Text>
            <Text className="text-textSecondary text-xs">
              Remaining: {formatINR(Math.max(0, Number(item.total_remaining)))}
            </Text>
          </View>
        </View>

        {/* Category Allocations */}
        {item.categories.length > 0 && (
          <View className="mt-1">
            <Text className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-1">
              Category Allocations
            </Text>
            {item.categories.map(renderCategoryItem)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text">Budgets</Text>
        <TouchableOpacity
          onPress={() => router.push('/budgets/add')}
          className="bg-primary px-3 py-1.5 rounded-lg flex-row items-center"
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text className="text-white text-xs font-bold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : budgets.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="pie-chart-outline" size={64} color="#6b7280" className="mb-4" />
          <Text className="text-text font-bold text-lg mb-1">No Budgets Created</Text>
          <Text className="text-textSecondary text-center text-sm mb-6">
            Set spending limits for Food, Fuel, Shopping, and more to stay on track.
          </Text>
          <TouchableOpacity
            className="bg-primary px-5 py-3 rounded-xl flex-row items-center shadow-lg"
            onPress={() => router.push('/budgets/add')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text className="text-white font-bold text-sm ml-1.5">Create First Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id}
          renderItem={renderBudgetItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#6C63FF"
              colors={['#6C63FF']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
