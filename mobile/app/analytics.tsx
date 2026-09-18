import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../src/api/analytics';
import { formatINR } from '../src/utils/formatting';
import { CategoryBreakdownItem, DailyTrendItem } from '../src/types/analytics';

type PresetOption = '7d' | '15d' | '30d' | '90d' | 'ytd' | 'custom';
type TrendViewMode = 'daily' | 'monthly';

export default function AnalyticsScreen() {
  const router = useRouter();

  // Dates in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Preset & custom range state (defaults to last 30 days)
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('30d');
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  const [activeStartDate, setActiveStartDate] = useState<string>(thirtyDaysAgoStr);
  const [activeEndDate, setActiveEndDate] = useState<string>(todayStr);

  // Selected bar state for daily pattern inspection
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  // Preferred trend view (daily vs monthly)
  const [trendView, setTrendView] = useState<TrendViewMode>('daily');

  // Query analytics dynamically with active range
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['analytics', 'custom', activeStartDate, activeEndDate],
    queryFn: () => analyticsApi.getAnalytics('custom', activeStartDate, activeEndDate),
  });

  const analytics = data?.data;

  // Preset quick click: instantly applies range dynamically
  const handlePresetSelect = (days: number, key: PresetOption) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setSelectedPreset(key);
    setShowCustomInputs(false);
    setCustomStartDate(sStr);
    setCustomEndDate(eStr);
    setActiveStartDate(sStr);
    setActiveEndDate(eStr);
    setSelectedBarIdx(null);
    if (days > 45) {
      setTrendView('monthly');
    } else {
      setTrendView('daily');
    }
  };

  // YTD preset
  const handleYTDSelect = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];
    setSelectedPreset('ytd');
    setShowCustomInputs(false);
    setCustomStartDate(sStr);
    setCustomEndDate(eStr);
    setActiveStartDate(sStr);
    setActiveEndDate(eStr);
    setSelectedBarIdx(null);
    setTrendView('monthly');
  };

  // Manual apply custom date range
  const handleApplyCustom = () => {
    if (!customStartDate || !customEndDate) return;
    setSelectedPreset('custom');
    setActiveStartDate(customStartDate);
    setActiveEndDate(customEndDate);
    setSelectedBarIdx(null);
    try {
      const diffDays = Math.round(
        (new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 45) {
        setTrendView('monthly');
      } else {
        setTrendView('daily');
      }
    } catch {
      // ignore
    }
  };

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

  const categories: CategoryBreakdownItem[] = analytics?.category_breakdown || [];
  const dailyTrends: DailyTrendItem[] = analytics?.daily_trends || [];
  const monthlyTrends = analytics?.monthly_trends || [];

  // Dynamic totals & period metadata from API
  const totalPeriodSpend = Number(analytics?.period_total ?? analytics?.this_month_total ?? 0);
  const totalTxCount = analytics?.period_transaction_count ?? 0;
  const periodDays = analytics?.period_days ?? 30;
  const changePct = analytics?.month_over_month_change_pct ?? 0;
  const hasPriorComparison = Number(analytics?.last_month_total || 0) > 0;

  // Max value for daily trend bars
  const maxDailyAmount = Math.max(
    ...dailyTrends.map((t) => Number(t.total_amount)),
    1
  );

  // Max value for monthly trend bars
  const maxMonthAmount = Math.max(
    ...monthlyTrends.map((t) => Number(t.total_amount)),
    1
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text className="text-textSecondary text-xs mt-3">Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
            className="p-1 -ml-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-text">Spending Intelligence</Text>
            <Text className="text-[11px] text-textSecondary font-medium">
              {analytics?.start_date && analytics?.end_date
                ? `${analytics.start_date} → ${analytics.end_date}`
                : 'Analytics Overview'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => refetch()}
          className="p-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh-outline" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
      >
        {/* ================= 1. DYNAMIC DATE RANGE SELECTOR & PRESETS ================= */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={16} color="#6C63FF" />
              <Text className="text-text font-bold text-sm">Date Range</Text>
            </View>
            <View className="bg-primary/20 px-2.5 py-0.5 rounded-full border border-primary/30">
              <Text className="text-primary text-[11px] font-bold">
                {periodDays} Days
              </Text>
            </View>
          </View>

          {/* Quick Presets Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-1 px-1">
            <View className="flex-row gap-2">
              {[
                { key: '7d', label: '7 Days', days: 7 },
                { key: '15d', label: '15 Days', days: 15 },
                { key: '30d', label: '30 Days', days: 30 },
                { key: '90d', label: '90 Days', days: 90 },
              ].map((p) => {
                const isSelected = selectedPreset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => handlePresetSelect(p.days, p.key as PresetOption)}
                    activeOpacity={0.7}
                    className={`px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-primary border-primary shadow-sm'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-textSecondary'
                      }`}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* YTD Preset */}
              <TouchableOpacity
                onPress={handleYTDSelect}
                activeOpacity={0.7}
                className={`px-3.5 py-2 rounded-xl border ${
                  selectedPreset === 'ytd'
                    ? 'bg-primary border-primary shadow-sm'
                    : 'bg-background border-border'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedPreset === 'ytd' ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  YTD
                </Text>
              </TouchableOpacity>

              {/* Custom Date Range Toggle */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedPreset('custom');
                  setShowCustomInputs(!showCustomInputs);
                }}
                activeOpacity={0.7}
                className={`px-3.5 py-2 rounded-xl border flex-row items-center gap-1 ${
                  selectedPreset === 'custom' || showCustomInputs
                    ? 'bg-primary/20 border-primary'
                    : 'bg-background border-border'
                }`}
              >
                <Ionicons
                  name="options-outline"
                  size={14}
                  color={selectedPreset === 'custom' || showCustomInputs ? '#6C63FF' : '#94a3b8'}
                />
                <Text
                  className={`text-xs font-bold ${
                    selectedPreset === 'custom' || showCustomInputs
                      ? 'text-primary'
                      : 'text-textSecondary'
                  }`}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Collapsible / Active Custom Date Inputs */}
          {showCustomInputs && (
            <View className="pt-2 border-t border-border/80">
              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-[10px] font-semibold mb-1">Start Date</Text>
                  <TextInput
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-xl px-3 py-2 text-text font-mono text-xs"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-textSecondary text-[10px] font-semibold mb-1">End Date</Text>
                  <TextInput
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-xl px-3 py-2 text-text font-mono text-xs"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleApplyCustom}
                activeOpacity={0.8}
                className="bg-primary py-2.5 rounded-xl items-center flex-row justify-center gap-2"
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Apply Custom Range</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ================= 2. TOTAL PERIOD SPEND BANNER ================= */}
        <View className="bg-card rounded-2xl p-5 mb-4 border border-border shadow-sm">
          <View className="flex-row justify-between items-center mb-1.5">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="text-textSecondary text-xs font-semibold uppercase tracking-wider">
                {`Period Spend (${periodDays} Days)`}
              </Text>
            </View>

            {/* Transaction Count Badge */}
            {totalTxCount > 0 && (
              <View className="bg-elevated px-2 py-0.5 rounded-md border border-border">
                <Text className="text-textSecondary text-[10px] font-semibold">
                  {totalTxCount} {totalTxCount === 1 ? 'tx' : 'txns'}
                </Text>
              </View>
            )}
          </View>

          {/* Big Amount */}
          <Text className="text-text text-3xl font-extrabold my-1">
            {formatINR(totalPeriodSpend)}
          </Text>

          {/* Comparison to prior period */}
          <View className="flex-row items-center justify-between mt-1">
            {hasPriorComparison ? (
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`px-2 py-0.5 rounded-full flex-row items-center ${
                    changePct > 0
                      ? 'bg-danger/20 border border-danger/30'
                      : 'bg-success/20 border border-success/30'
                  }`}
                >
                  <Ionicons
                    name={changePct > 0 ? 'trending-up' : 'trending-down'}
                    size={11}
                    color={changePct > 0 ? '#FF6B6B' : '#00C48C'}
                  />
                  <Text
                    className={`text-[10px] font-bold ml-1 ${
                      changePct > 0 ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {changePct > 0 ? '+' : ''}
                    {changePct}%
                  </Text>
                </View>
                <Text className="text-textSecondary text-[11px]">
                  vs. {formatINR(Number(analytics?.last_month_total || 0))} prior period
                </Text>
              </View>
            ) : (
              <Text className="text-textSecondary text-[11px]">
                Calculated across {periodDays} days
              </Text>
            )}

            <Text className="text-textSecondary text-[10px] font-mono">
              {analytics?.start_date?.slice(5)} to {analytics?.end_date?.slice(5)}
            </Text>
          </View>
        </View>

        {/* ================= 4. DYNAMIC PERIOD AVERAGES ================= */}
        <View className="flex-row justify-between mb-4 gap-2">
          <View className="bg-card rounded-xl p-3 flex-1 border border-border">
            <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">
              Daily Avg
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.daily_average || 0))}
            </Text>
            <Text className="text-textSecondary text-[9px] mt-0.5">per day</Text>
          </View>

          <View className="bg-card rounded-xl p-3 flex-1 border border-border">
            <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">
              Weekly Avg
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.weekly_average || 0))}
            </Text>
            <Text className="text-textSecondary text-[9px] mt-0.5">7-day pace</Text>
          </View>

          <View className="bg-card rounded-xl p-3 flex-1 border border-border">
            <Text className="text-textSecondary text-[10px] font-bold uppercase mb-1">
              Monthly Avg
            </Text>
            <Text className="text-text text-base font-bold">
              {formatINR(Number(analytics?.monthly_average || 0))}
            </Text>
            <Text className="text-textSecondary text-[9px] mt-0.5">30-day baseline</Text>
          </View>
        </View>

        {/* ================= 5. CATEGORY BREAKDOWN ================= */}
        <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-text font-bold text-base">Category Breakdown</Text>
              <Text className="text-textSecondary text-xs mt-0.5">
                Spending distribution in this period
              </Text>
            </View>
            <View className="bg-elevated px-2.5 py-1 rounded-full border border-border">
              <Text className="text-textSecondary text-xs font-semibold">
                {categories.length} Categories
              </Text>
            </View>
          </View>

          {categories.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="pie-chart-outline" size={40} color="#64748b" />
              <Text className="text-textSecondary text-xs mt-2">
                No expense transactions recorded in this period.
              </Text>
            </View>
          ) : (
            <View>
              {/* Donut Ring Visual representation */}
              <View className="items-center justify-center my-3">
                <View className="w-40 h-40 rounded-full border-[14px] border-card bg-elevated/40 items-center justify-center shadow-inner relative overflow-hidden">
                  <View
                    className="absolute inset-0 rounded-full border-[12px]"
                    style={{ borderColor: categories[0]?.color || '#6C63FF' }}
                  />
                  <View className="items-center justify-center bg-card w-24 h-24 rounded-full border border-border">
                    <Text className="text-textSecondary text-[10px] font-semibold uppercase">
                      Total
                    </Text>
                    <Text className="text-text font-extrabold text-xs text-center px-1">
                      {formatINR(totalPeriodSpend)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Segmented Proportional Progress Bar */}
              <View className="h-3 w-full bg-elevated rounded-full overflow-hidden flex-row mb-4">
                {categories.map((cat, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: `${Math.max(cat.percentage, 2)}%`,
                      backgroundColor: cat.color || '#6C63FF',
                    }}
                    className="h-full"
                  />
                ))}
              </View>

              {/* Category Legend & Details */}
              <View className="gap-2.5">
                {categories.map((cat, idx) => (
                  <View
                    key={idx}
                    className="bg-background/80 p-3 rounded-xl border border-border/80 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View
                        className="w-3.5 h-3.5 rounded-full mr-2.5"
                        style={{ backgroundColor: cat.color || '#6C63FF' }}
                      />
                      <Text className="text-base mr-2">{cat.icon || '🏷️'}</Text>
                      <View className="flex-1">
                        <Text className="text-text font-semibold text-sm" numberOfLines={1}>
                          {cat.category_name}
                        </Text>
                        <View className="h-1.5 w-full bg-elevated rounded-full overflow-hidden mt-1">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(cat.percentage, 4)}%`,
                              backgroundColor: cat.color || '#6C63FF',
                            }}
                          />
                        </View>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-text font-bold text-sm">
                        {formatINR(Number(cat.total_amount))}
                      </Text>
                      <Text className="text-textSecondary text-[11px] font-medium">
                        {cat.percentage}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ================= 6. ADAPTIVE SPENDING TRENDS (DAILY & MONTHLY) ================= */}
        <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-text font-bold text-base">Spending Trends</Text>
              <Text className="text-textSecondary text-xs mt-0.5">
                {trendView === 'daily'
                  ? 'Day-by-day pattern in period'
                  : 'Monthly aggregated comparison'}
              </Text>
            </View>

            {/* Toggle Pills: Daily vs Monthly */}
            <View className="flex-row bg-background p-1 rounded-lg border border-border">
              <TouchableOpacity
                onPress={() => setTrendView('daily')}
                className={`px-2.5 py-1 rounded-md ${
                  trendView === 'daily' ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    trendView === 'daily' ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  Daily
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTrendView('monthly')}
                className={`px-2.5 py-1 rounded-md ${
                  trendView === 'monthly' ? 'bg-primary' : 'bg-transparent'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    trendView === 'monthly' ? 'text-white' : 'text-textSecondary'
                  }`}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* VIEW 1: DAILY SPENDING GRAPH */}
          {trendView === 'daily' && (
            dailyTrends.length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="bar-chart-outline" size={32} color="#64748b" />
                <Text className="text-textSecondary text-xs mt-2">
                  No daily expense logs in this period.
                </Text>
              </View>
            ) : (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
                  <View className="flex-row items-end h-40 pt-4 pb-1 gap-2 px-1">
                    {dailyTrends.map((d, idx) => {
                      const amount = Number(d.total_amount);
                      const isSelected = selectedBarIdx === idx;
                      const heightPct =
                        amount > 0 ? Math.max(Math.round((amount / maxDailyAmount) * 100), 15) : 4;
                      const dayNumber = d.date.split('-')[2] || d.date;

                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSelectedBarIdx(selectedBarIdx === idx ? null : idx)}
                          className="items-center w-9"
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-[9px] font-bold mb-1 ${
                              isSelected
                                ? 'text-primaryLight'
                                : amount > 0
                                ? 'text-text'
                                : 'text-textSecondary/30'
                            }`}
                          >
                            {amount >= 1000
                              ? `₹${Math.round(amount / 1000)}k`
                              : amount > 0
                              ? `₹${amount}`
                              : ''}
                          </Text>

                          <View className="w-6 bg-elevated/50 rounded-t-md overflow-hidden justify-end h-24 items-center">
                            {amount > 0 ? (
                              <View
                                className={`w-full rounded-t-md ${
                                  isSelected ? 'bg-primaryLight' : 'bg-primary'
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            ) : (
                              <View className="w-3 h-0.5 bg-border rounded-full mb-0.5" />
                            )}
                          </View>

                          <Text
                            className={`text-[10px] mt-1.5 font-medium ${
                              isSelected ? 'text-primary font-bold' : 'text-textSecondary'
                            }`}
                          >
                            {dayNumber}
                          </Text>
                          <Text className="text-[8px] text-textSecondary/70 uppercase">
                            {d.day_label.slice(0, 2)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {selectedBarIdx !== null && dailyTrends[selectedBarIdx] && (
                  <View className="bg-background p-2.5 rounded-lg border border-primary/40 mt-2 flex-row justify-between items-center">
                    <Text className="text-text font-semibold text-xs">
                      {dailyTrends[selectedBarIdx].date} ({dailyTrends[selectedBarIdx].day_label})
                    </Text>
                    <Text className="text-primary font-bold text-xs">
                      {formatINR(Number(dailyTrends[selectedBarIdx].total_amount))}
                    </Text>
                  </View>
                )}
              </View>
            )
          )}

          {/* VIEW 2: MONTHLY SPENDING GRAPH */}
          {trendView === 'monthly' && (
            monthlyTrends.length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="bar-chart-outline" size={32} color="#64748b" />
                <Text className="text-textSecondary text-xs mt-2">
                  No monthly data available.
                </Text>
              </View>
            ) : (
              <View className="flex-row items-end justify-between h-40 pt-4 pb-1">
                {monthlyTrends.map((m, idx) => {
                  const amount = Number(m.total_amount);
                  const isCurrentMonth = idx === monthlyTrends.length - 1;
                  const heightPct =
                    amount > 0 ? Math.max(Math.round((amount / maxMonthAmount) * 100), 16) : 0;
                  const monthName = m.period.split(' ')[0];

                  return (
                    <View key={idx} className="items-center flex-1">
                      <Text
                        className={`text-[10px] font-bold mb-1.5 ${
                          amount > 0
                            ? isCurrentMonth
                              ? 'text-primary font-extrabold'
                              : 'text-text'
                            : 'text-textSecondary/30'
                        }`}
                      >
                        {amount >= 1000
                          ? `₹${Math.round(amount / 1000)}k`
                          : amount > 0
                          ? `₹${amount}`
                          : '—'}
                      </Text>

                      <View className="w-8 bg-elevated/40 rounded-t-lg overflow-hidden justify-end h-24 items-center">
                        {amount > 0 ? (
                          <View
                            className={`w-full rounded-t-lg ${
                              isCurrentMonth ? 'bg-primary' : 'bg-primary/60'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        ) : (
                          <View className="w-4 h-0.5 bg-border/80 rounded-full mb-0.5" />
                        )}
                      </View>

                      <View className="mt-2 items-center">
                        <Text
                          className={`text-[11px] font-semibold ${
                            isCurrentMonth ? 'text-primary font-bold' : 'text-textSecondary'
                          }`}
                        >
                          {monthName}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>

        {/* ================= 7. SMART INSIGHTS ================= */}
        {analytics?.insights && analytics.insights.length > 0 && (
          <View className="mb-5">
            <Text className="text-text font-bold text-base mb-3">Period Insights</Text>
            {analytics.insights.map((insight, idx) => (
              <View
                key={idx}
                className={`p-4 rounded-2xl mb-2.5 border flex-row items-start ${getInsightBg(
                  insight.type
                )}`}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
                  style={{ backgroundColor: `${getInsightColor(insight.type)}20` }}
                >
                  <Ionicons
                    name={insight.icon as any}
                    size={17}
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

        {/* ================= 8. TOP MERCHANTS ================= */}
        {analytics?.top_merchants && analytics.top_merchants.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-5 border border-border">
            <Text className="text-text font-bold text-base mb-3">Top Merchants</Text>
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
                    <Text className="text-textSecondary text-[11px]">
                      {merchant.count} transactions
                    </Text>
                  </View>
                </View>
                <Text className="text-text font-bold text-sm">
                  {formatINR(Number(merchant.total_amount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================= 9. PAYMENT METHODS ================= */}
        {analytics?.payment_methods && analytics.payment_methods.length > 0 && (
          <View className="bg-card rounded-2xl p-5 mb-10 border border-border">
            <Text className="text-text font-bold text-base mb-3">Payment Methods</Text>
            {analytics.payment_methods.map((pm, idx) => (
              <View key={idx} className="mb-3.5 last:mb-0">
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={
                        pm.payment_method.toUpperCase().includes('UPI')
                          ? 'phone-portrait-outline'
                          : pm.payment_method.toUpperCase().includes('CARD')
                          ? 'card-outline'
                          : 'cash-outline'
                      }
                      size={15}
                      color="#6C63FF"
                    />
                    <Text className="text-text font-medium text-sm">{pm.payment_method}</Text>
                  </View>
                  <Text className="text-text font-bold text-xs">
                    {formatINR(Number(pm.total_amount))} ({pm.percentage}%)
                  </Text>
                </View>
                <View className="h-2 w-full bg-elevated rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.max(pm.percentage, 3)}%` }}
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
