import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../src/api/analytics';
import { formatINR } from '../src/utils/formatting';

export default function AnalyticsScreen() {
  const router = useRouter();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getAnalytics(),
  });

  const analytics = data?.data;

  const getInsightBg = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-warning/15 border-warning/30';
      case 'milestone':
        return 'bg-success/15 border-success/30';
      case 'anomaly':
        return 'bg-danger/15 border-danger/30';
      default:
        return 'bg-primary/15 border-primary/30';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return '#FFB946';
      case 'milestone':
        return '#00C48C';
      case 'anomaly':
        return '#FF6B6B';
      default:
        return '#6C63FF';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  const maxMonthAmount = Math.max(
    ...(analytics?.monthly_trends.map((t) => Number(t.total_amount)) || [1]),
    1
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text">Spending Intelligence</Text>
        <View style={{ width: 24 }} />
      </View>

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
        {/* Month-over-Month Banner */}
        <View className="bg-card rounded-2xl p-5 mb-4 border border-border">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-textSecondary text-xs font-semibold uppercase">
              Current Month Total
            </Text>
            {analytics?.month_over_month_change_pct !== undefined && (
              <View
                className={`px-2 py-0.5 rounded flex-row items-center ${
                  analytics.month_over_month_change_pct > 0 ? 'bg-danger/20' : 'bg-success/20'
                }`}
              >
                <Ionicons
                  name={analytics.month_over_month_change_pct > 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={analytics.month_over_month_change_pct > 0 ? '#FF6B6B' : '#00C48C'}
                />
                <Text
                  className={`text-[11px] font-bold ml-1 ${
                    analytics.month_over_month_change_pct > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {analytics.month_over_month_change_pct > 0 ? '+' : ''}
                  {analytics.month_over_month_change_pct}%
                </Text>
              </View>
            )}
          </View>
          <Text className="text-text text-3xl font-bold mb-1">
            {formatINR(Number(analytics?.this_month_total || 0))}
          </Text>
          <Text className="text-textSecondary text-xs">
            vs. {formatINR(Number(analytics?.last_month_total || 0))} last month
          </Text>
        </View>

        {/* Averages Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="bg-card rounded-xl p-3.5 flex-1 mr-2 border border-border">
            <Text className="text-textSecondary text-[10px] font-semibold uppercase mb-1">
              Daily Avg (30d)
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.daily_average || 0))}
            </Text>
          </View>
          <View className="bg-card rounded-xl p-3.5 flex-1 mr-2 border border-border">
            <Text className="text-textSecondary text-[10px] font-semibold uppercase mb-1">
              Weekly Avg
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.weekly_average || 0))}
            </Text>
          </View>
          <View className="bg-card rounded-xl p-3.5 flex-1 border border-border">
            <Text className="text-textSecondary text-[10px] font-semibold uppercase mb-1">
              Monthly Avg
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.monthly_average || 0))}
            </Text>
          </View>
        </View>

        {/* Smart Personalized Insights */}
        {analytics?.insights && analytics.insights.length > 0 && (
          <View className="mb-5">
            <Text className="text-text font-bold text-base mb-3">Personalized Insights</Text>
            {analytics.insights.map((insight, idx) => (
              <View
                key={idx}
                className={`p-4 rounded-2xl mb-2.5 border flex-row items-start ${getInsightBg(
                  insight.type
                )}`}
              >
                <View className="mr-3 mt-0.5">
                  <Ionicons
                    name={insight.icon as any}
                    size={20}
                    color={getInsightColor(insight.type)}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-bold text-xs uppercase tracking-wider mb-1"
                    style={{ color: getInsightColor(insight.type) }}
                  >
                    {insight.title}
                  </Text>
                  <Text className="text-text text-sm leading-5">{insight.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 6-Month Historical Spending Trend Chart */}
        {analytics?.monthly_trends && analytics.monthly_trends.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
            <Text className="text-text font-bold text-base mb-4">6-Month Spending Trend</Text>
            <View className="flex-row items-end justify-between h-32 pt-2 px-1">
              {analytics.monthly_trends.map((m, idx) => {
                const heightPct = Math.max(
                  Math.round((Number(m.total_amount) / maxMonthAmount) * 100),
                  8
                );
                return (
                  <View key={idx} className="items-center flex-1 mx-1">
                    <Text className="text-textSecondary text-[9px] font-bold mb-1">
                      {Number(m.total_amount) >= 1000
                        ? `₹${Math.round(Number(m.total_amount) / 1000)}k`
                        : `₹${Number(m.total_amount)}`}
                    </Text>
                    <View className="w-full bg-elevated rounded-t-md overflow-hidden justify-end h-20">
                      <View
                        className="w-full bg-primary rounded-t-md"
                        style={{ height: `${heightPct}%` }}
                      />
                    </View>
                    <Text className="text-textSecondary text-[10px] mt-1.5" numberOfLines={1}>
                      {m.period.split(' ')[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Merchants */}
        {analytics?.top_merchants && analytics.top_merchants.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
            <Text className="text-text font-bold text-base mb-3">Top Merchants (Last 90 Days)</Text>
            {analytics.top_merchants.map((merchant, idx) => (
              <View
                key={idx}
                className="flex-row justify-between items-center py-2.5 border-b border-border/50 last:border-b-0"
              >
                <View className="flex-row items-center">
                  <View className="w-7 h-7 rounded-full bg-elevated items-center justify-center mr-3">
                    <Text className="text-primary font-bold text-xs">{idx + 1}</Text>
                  </View>
                  <View>
                    <Text className="text-text font-medium text-sm">{merchant.merchant}</Text>
                    <Text className="text-textSecondary text-[11px]">{merchant.count} transactions</Text>
                  </View>
                </View>
                <Text className="text-text font-bold text-sm">
                  {formatINR(Number(merchant.total_amount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment Methods Breakdown */}
        {analytics?.payment_methods && analytics.payment_methods.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-10 border border-border">
            <Text className="text-text font-bold text-base mb-3">Payment Methods (This Month)</Text>
            {analytics.payment_methods.map((pm, idx) => (
              <View key={idx} className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-text font-medium text-sm">{pm.payment_method}</Text>
                  <Text className="text-text font-bold text-xs">
                    {formatINR(Number(pm.total_amount))} ({pm.percentage}%)
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${pm.percentage}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
