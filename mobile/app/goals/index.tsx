import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goalApi } from '../../src/api/goals';
import { Goal } from '../../src/types/goal';
import { formatCurrency, formatPercentage } from '../../src/utils/formatting';

export default function GoalsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SAVINGS');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [submitting, setSubmitting] = useState(false);

  // Contribute Modal
  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const data = await goalApi.getGoals();
      setGoals(data);
    } catch (e) {
      console.error('Failed to load goals:', e);
    }
  }, []);

  useEffect(() => {
    loadGoals().finally(() => setLoading(false));
  }, [loadGoals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const handleCreateGoal = async () => {
    if (!name.trim() || !targetAmount || !targetDate) {
      Alert.alert('Error', 'Please fill name, target amount, and target date');
      return;
    }
    setSubmitting(true);
    try {
      await goalApi.createGoal({
        name: name.trim(),
        category,
        target_amount: parseFloat(targetAmount),
        current_amount: currentAmount ? parseFloat(currentAmount) : 0,
        target_date: targetDate,
      });
      setCreateModalVisible(false);
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      await loadGoals();
      Alert.alert('Success', 'Goal created successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async () => {
    if (!selectedGoal || !contribAmount) {
      Alert.alert('Error', 'Please enter contribution amount');
      return;
    }
    setContributing(true);
    try {
      await goalApi.contribute(selectedGoal.id, {
        amount: parseFloat(contribAmount),
      });
      setContributeModalVisible(false);
      setContribAmount('');
      setSelectedGoal(null);
      await loadGoals();
      Alert.alert('Success', 'Funds added to your goal! 🎉');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to record contribution');
    } finally {
      setContributing(false);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert('Delete Goal', `Are you sure you want to delete "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalApi.deleteGoal(goal.id);
            setGoals((prev) => prev.filter((g) => g.id !== goal.id));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete goal');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 border-b border-border bg-card flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text">Financial Goals</Text>
        </View>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          className="bg-primary px-3 py-1.5 rounded-lg flex-row items-center gap-1"
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text className="text-white font-bold text-xs">New Goal</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-textSecondary mt-2">Loading goals...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {goals.length === 0 ? (
            <View className="bg-card p-8 rounded-2xl border border-border items-center justify-center mt-6">
              <Ionicons name="flag-outline" size={56} color="#64748b" />
              <Text className="text-text font-bold text-lg mt-3">No Financial Goals Yet</Text>
              <Text className="text-textSecondary text-xs text-center mt-1 mb-4">
                Set goals like Emergency Fund, Bike Downpayment, or Vacation to track your target savings.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                className="bg-primary px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-sm">Create Your First Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            goals.map((goal) => {
              const isCompleted = goal.status === 'COMPLETED' || goal.progress_pct >= 100;
              return (
                <View key={goal.id} className="bg-card p-4 rounded-xl border border-border mb-3.5">
                  {/* Top Row */}
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-text font-bold text-base">{goal.name}</Text>
                        <View
                          className={`px-2 py-0.5 rounded-full border ${
                            isCompleted ? 'bg-success/20 border-success' : 'bg-primary/20 border-primary'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isCompleted ? 'text-success' : 'text-primary'
                            }`}
                          >
                            {goal.status}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-textSecondary text-xs mt-0.5">{goal.category.replace('_', ' ')}</Text>
                    </View>

                    <TouchableOpacity onPress={() => handleDeleteGoal(goal)} className="p-1">
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Amounts */}
                  <View className="flex-row justify-between items-baseline mt-3">
                    <Text className="text-xl font-bold text-text">
                      {formatCurrency(goal.current_amount)}{' '}
                      <Text className="text-textSecondary text-xs font-normal">
                        of {formatCurrency(goal.target_amount)}
                      </Text>
                    </Text>
                    <Text
                      className={`text-sm font-bold ${
                        isCompleted ? 'text-success' : 'text-primary'
                      }`}
                    >
                      {formatPercentage(goal.progress_pct)}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="h-2 bg-background rounded-full mt-2 overflow-hidden border border-border">
                    <View
                      className={`h-full rounded-full ${
                        isCompleted ? 'bg-success' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, goal.progress_pct))}%` }}
                    />
                  </View>

                  {/* Recommendation & Target info */}
                  <View className="mt-3 pt-2.5 border-t border-border flex-row justify-between items-center">
                    <View>
                      {!isCompleted ? (
                        <Text className="text-textSecondary text-xs">
                          Need <Text className="text-accent font-semibold">{formatCurrency(goal.monthly_contribution_needed)}/mo</Text> • {goal.days_remaining}d left
                        </Text>
                      ) : (
                        <Text className="text-success text-xs font-semibold">🎉 Goal Achieved!</Text>
                      )}
                    </View>

                    {!isCompleted && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedGoal(goal);
                          setContributeModalVisible(true);
                        }}
                        className="bg-primary/20 border border-primary px-2.5 py-1 rounded-lg flex-row items-center gap-1"
                      >
                        <Ionicons name="add" size={14} color="#6366f1" />
                        <Text className="text-primary text-xs font-bold">Add Funds</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* MODAL: CREATE GOAL */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">New Financial Goal</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Goal Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Emergency Fund, Bike Downpayment"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
            />

            <Text className="text-textSecondary text-xs mb-1">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {['SAVINGS', 'EMERGENCY_FUND', 'VEHICLE', 'VACATION', 'GADGET', 'HOME'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-lg border ${
                    category === cat ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      category === cat ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Target Amount (₹)</Text>
                <TextInput
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  placeholder="e.g. 50000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Already Saved (₹)</Text>
                <TextInput
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  placeholder="e.g. 10000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Target Date (YYYY-MM-DD)</Text>
            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="e.g. 2026-12-31"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-4"
            />

            <TouchableOpacity
              onPress={handleCreateGoal}
              disabled={submitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Create Goal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: CONTRIBUTE TO GOAL */}
      <Modal visible={contributeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">
                Add Funds to {selectedGoal?.name}
              </Text>
              <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Amount to Add (₹)</Text>
            <TextInput
              value={contribAmount}
              onChangeText={setContribAmount}
              placeholder="e.g. 2500"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-3"
            />

            {/* Quick Amount Chips */}
            <View className="flex-row gap-2 mb-4">
              {[500, 1000, 2000, 5000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setContribAmount(String(amt))}
                  className="bg-background px-3 py-1.5 rounded-lg border border-border"
                >
                  <Text className="text-textSecondary text-xs font-semibold">+₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleContribute}
              disabled={contributing}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {contributing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Deposit Savings</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
