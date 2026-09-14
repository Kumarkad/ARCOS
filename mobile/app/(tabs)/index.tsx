import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/authStore';
import { getGreeting, formatINR } from '../../src/utils/formatting';
import { expensesApi } from '../../src/api/expenses';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const greeting = getGreeting();

  const {
    data: summaryData,
    isLoading,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => expensesApi.getExpenseSummary(),
  });

  const summary = summaryData?.data;
  const todayTotal = Number(summary?.today_total || 0);
  const monthTotal = Number(summary?.this_month_total || 0);
  const categories = summary?.category_breakdown || [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
      >
        {/* User Greeting & Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
            className="flex-1 mr-3"
          >
            <View className="flex-row items-center gap-2 mb-1.5">
              <View className="bg-primary/20 px-2 py-0.5 rounded-full border border-primary/40 flex-row items-center gap-1">
                <Ionicons name="flash" size={11} color="#6C63FF" />
                <Text className="text-primary text-[11px] font-extrabold">ARCOS</Text>
              </View>
              <Text className="text-textSecondary text-xs font-medium">• {greeting}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-text text-2xl font-bold" numberOfLines={1}>
                {user?.full_name || 'User'}
              </Text>
              <Text className="text-xl">👋</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-primary items-center justify-center shadow-sm"
            onPress={() => router.push('/(tabs)/expenses/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Quick Spending Overview Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="bg-card rounded-2xl p-4 flex-1 mr-2 border border-border">
            <View className="flex-row items-center mb-1.5">
              <View className="w-2 h-2 rounded-full bg-primary mr-2" />
              <Text className="text-textSecondary text-xs font-semibold uppercase">
                Today's Spending
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Text className="text-text text-2xl font-bold">{formatINR(todayTotal)}</Text>
            )}
          </View>

          <View className="bg-card rounded-2xl p-4 flex-1 ml-2 border border-border">
            <View className="flex-row items-center mb-1.5">
              <View className="w-2 h-2 rounded-full bg-success mr-2" />
              <Text className="text-textSecondary text-xs font-semibold uppercase">
                This Month
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Text className="text-text text-2xl font-bold">{formatINR(monthTotal)}</Text>
            )}
          </View>
        </View>

        {/* Quick Add Expense Action Card */}
        <TouchableOpacity
          className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/expenses/add')}
        >
          <View className="flex-row items-center space-x-3">
            <View className="w-10 h-10 rounded-xl bg-primary items-center justify-center mr-3">
              <Ionicons name="flash-outline" size={22} color="#fff" />
            </View>
            <View>
              <Text className="text-text font-bold text-base">Quick Add Expense</Text>
              <Text className="text-textSecondary text-xs">Log chai, food, fuel or travel</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
        </TouchableOpacity>

        {/* JARVIS Assistant Shortcut Card */}
        <TouchableOpacity
          className="bg-card border border-primary/30 rounded-2xl p-4 mb-4 flex-row items-center justify-between"
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <View className="flex-row items-center space-x-3">
            <View className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 items-center justify-center mr-3">
              <Ionicons name="sparkles" size={20} color="#6C63FF" />
            </View>
            <View>
              <View className="flex-row items-center">
                <Text className="text-text font-bold text-base">JARVIS Assistant</Text>
                <View className="ml-2 bg-primary/20 px-1.5 py-0.5 rounded">
                  <Text className="text-primary text-[10px] font-bold">AI</Text>
                </View>
              </View>
              <Text className="text-textSecondary text-xs">Your Personal Financial Intelligence System</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
        </TouchableOpacity>

        {/* Feature Hub (Budgets, Analytics & Goals shortcuts) */}
        <View className="flex-row justify-between mb-5 gap-2">
          <TouchableOpacity
            className="bg-card rounded-2xl p-3 flex-1 border border-border items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/budgets')}
          >
            <View className="w-9 h-9 rounded-xl bg-warning/20 items-center justify-center mb-1">
              <Ionicons name="pie-chart-outline" size={18} color="#FFB946" />
            </View>
            <Text className="text-text font-bold text-xs">Budgets</Text>
            <Text className="text-textSecondary text-[10px]">Limits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-card rounded-2xl p-3 flex-1 border border-border items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/analytics')}
          >
            <View className="w-9 h-9 rounded-xl bg-success/20 items-center justify-center mb-1">
              <Ionicons name="bar-chart-outline" size={18} color="#00C48C" />
            </View>
            <Text className="text-text font-bold text-xs">Analytics</Text>
            <Text className="text-textSecondary text-[10px]">Trends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-card rounded-2xl p-3 flex-1 border border-border items-center"
            activeOpacity={0.8}
            onPress={() => router.push('/goals')}
          >
            <View className="w-9 h-9 rounded-xl bg-primary/20 items-center justify-center mb-1">
              <Ionicons name="flag-outline" size={18} color="#6366f1" />
            </View>
            <Text className="text-text font-bold text-xs">Goals</Text>
            <Text className="text-textSecondary text-[10px]">Savings</Text>
          </TouchableOpacity>
        </View>

        {/* Category Spending Breakdown (Top 4) */}
        {categories.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-base">Monthly Category Breakdown</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
                <Text className="text-primary text-xs font-semibold">View All</Text>
              </TouchableOpacity>
            </View>

            {categories.slice(0, 4).map((cat) => (
              <View key={cat.category_id} className="mb-3.5">
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center">
                    <Text className="text-base mr-2">{cat.category_icon || '📦'}</Text>
                    <Text className="text-text text-sm font-medium">{cat.category_name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-text text-sm font-bold">
                      {formatINR(Number(cat.total_amount))}
                    </Text>
                    <Text className="text-textSecondary text-[10px]">{cat.percentage}%</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(cat.percentage, 100)}%`,
                      backgroundColor: cat.category_color || '#6C63FF',
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Portfolio Preview Card */}
        <View className="bg-card rounded-2xl p-5 mb-4 border border-border">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-text font-bold text-base">Investments & Stocks</Text>
            <View className="bg-elevated px-2 py-0.5 rounded">
              <Text className="text-textSecondary text-[10px] uppercase font-bold">Phase 5</Text>
            </View>
          </View>
          <Text className="text-textSecondary text-xs mb-3">
            Track Stocks, Mutual Funds, ETFs, and IPOs with real market data.
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.push('/(tabs)/investments')}
          >
            <Text className="text-primary text-xs font-bold">Go to Investments</Text>
            <Ionicons name="arrow-forward" size={12} color="#6C63FF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Vehicle Tracker Preview Card */}
        <View className="bg-card rounded-2xl p-5 mb-10 border border-border">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-text font-bold text-base">Vehicle Tracker</Text>
            <View className="bg-elevated px-2 py-0.5 rounded">
              <Text className="text-textSecondary text-[10px] uppercase font-bold">Phase 6</Text>
            </View>
          </View>
          <Text className="text-textSecondary text-xs mb-3">
            Track fuel fills, calculate exact mileage (km/L), and service reminders.
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.push('/(tabs)/vehicle/index')}
          >
            <Text className="text-primary text-xs font-bold">Go to Vehicle</Text>
            <Ionicons name="arrow-forward" size={12} color="#6C63FF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
