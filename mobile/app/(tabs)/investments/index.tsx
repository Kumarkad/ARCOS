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
import { Ionicons } from '@expo/vector-icons';
import { investmentApi } from '../../../src/api/investments';
import {
  PortfolioSummary,
  Holding,
  WatchlistItem,
  IPOPrompt,
  InvestmentAccount,
  IPOAnalyzeResult,
} from '../../../src/types/investment';
import { formatCurrency, formatPercentage } from '../../../src/utils/formatting';

type Segment = 'Portfolio' | 'Watchlist' | 'IPO';

export default function InvestmentsScreen() {
  const [activeSegment, setActiveSegment] = useState<Segment>('Portfolio');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txSymbol, setTxSymbol] = useState('');
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [txQty, setTxQty] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txAccount, setTxAccount] = useState('');
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [wlModalVisible, setWlModalVisible] = useState(false);
  const [wlSymbol, setWlSymbol] = useState('');
  const [wlTargetPrice, setWlTargetPrice] = useState('');
  const [wlSubmitting, setWlSubmitting] = useState(false);

  // IPO state
  const [prompts, setPrompts] = useState<IPOPrompt[]>([]);
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [promptIsDefault, setPromptIsDefault] = useState(false);
  const [promptSubmitting, setPromptSubmitting] = useState(false);

  // IPO Analysis state
  const [analyzeModalVisible, setAnalyzeModalVisible] = useState(false);
  const [ipoName, setIpoName] = useState('');
  const [ipoDetails, setIpoDetails] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(undefined);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<IPOAnalyzeResult | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (activeSegment === 'Portfolio') {
        const [portData, accsData] = await Promise.all([
          investmentApi.getPortfolio(),
          investmentApi.getAccounts(),
        ]);
        setPortfolio(portData);
        setAccounts(accsData);
        if (accsData.length > 0 && !txAccount) {
          setTxAccount(accsData[0].id);
        }
      } else if (activeSegment === 'Watchlist') {
        const wlData = await investmentApi.getWatchlist();
        setWatchlist(wlData);
      } else if (activeSegment === 'IPO') {
        const promptsData = await investmentApi.getIPOPrompts();
        setPrompts(promptsData);
        const defPrompt = promptsData.find((p) => p.is_default);
        if (defPrompt) {
          setSelectedPromptId(defPrompt.id);
        } else if (promptsData.length > 0) {
          setSelectedPromptId(promptsData[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load investments data:', err);
    }
  }, [activeSegment, txAccount]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [activeSegment, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Transaction Handler
  const handleCreateTransaction = async () => {
    if (!txSymbol.trim() || !txQty || !txPrice) {
      Alert.alert('Error', 'Please fill symbol, quantity, and price');
      return;
    }

    let accId = txAccount;
    if (!accId) {
      // Auto-create default account if none exists
      if (accounts.length === 0) {
        try {
          const newAcc = await investmentApi.createAccount({
            name: 'Primary Demat',
            broker_name: 'Zerodha',
          });
          accId = newAcc.id;
          setAccounts([newAcc]);
        } catch (e: any) {
          Alert.alert('Error', 'Failed to create default account');
          return;
        }
      } else {
        accId = accounts[0].id;
      }
    }

    setTxSubmitting(true);
    try {
      await investmentApi.recordTransaction({
        account_id: accId,
        symbol: txSymbol.trim().toUpperCase(),
        asset_type: 'STOCK',
        transaction_type: txType,
        quantity: parseFloat(txQty),
        price: parseFloat(txPrice),
        transaction_date: new Date().toISOString().split('T')[0],
      });
      setTxModalVisible(false);
      setTxSymbol('');
      setTxQty('');
      setTxPrice('');
      await loadData();
      Alert.alert('Success', `${txType} transaction recorded successfully`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to record transaction');
    } finally {
      setTxSubmitting(false);
    }
  };

  // Watchlist Handlers
  const handleAddToWatchlist = async () => {
    if (!wlSymbol.trim()) {
      Alert.alert('Error', 'Please enter a ticker symbol');
      return;
    }
    setWlSubmitting(true);
    try {
      await investmentApi.addToWatchlist({
        symbol: wlSymbol.trim().toUpperCase(),
        target_price: wlTargetPrice ? parseFloat(wlTargetPrice) : undefined,
      });
      setWlModalVisible(false);
      setWlSymbol('');
      setWlTargetPrice('');
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add to watchlist');
    } finally {
      setWlSubmitting(false);
    }
  };

  const handleRemoveWatchlist = async (id: string) => {
    try {
      await investmentApi.removeFromWatchlist(id);
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      Alert.alert('Error', 'Failed to remove from watchlist');
    }
  };

  // IPO Prompt Handlers
  const handleSavePrompt = async () => {
    if (!promptName.trim() || promptContent.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid title and prompt content (min 10 chars)');
      return;
    }
    setPromptSubmitting(true);
    try {
      if (editingPromptId) {
        await investmentApi.updateIPOPrompt(editingPromptId, {
          name: promptName.trim(),
          prompt_content: promptContent.trim(),
          is_default: promptIsDefault,
        });
      } else {
        await investmentApi.createIPOPrompt({
          name: promptName.trim(),
          prompt_content: promptContent.trim(),
          is_default: promptIsDefault,
        });
      }
      setPromptModalVisible(false);
      setEditingPromptId(null);
      setPromptName('');
      setPromptContent('');
      setPromptIsDefault(false);
      await loadData();
      Alert.alert('Success', 'Prompt saved successfully');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save prompt');
    } finally {
      setPromptSubmitting(false);
    }
  };

  const handleDeletePrompt = (id: string, name: string) => {
    Alert.alert('Delete Prompt', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await investmentApi.deleteIPOPrompt(id);
            setPrompts((prev) => prev.filter((p) => p.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Cannot delete prompt');
          }
        },
      },
    ]);
  };

  // IPO Analysis Handler
  const handleRunAnalysis = async () => {
    if (!ipoName.trim()) {
      Alert.alert('Error', 'Please enter company or IPO name');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await investmentApi.analyzeIPO({
        ipo_name: ipoName.trim(),
        prompt_id: selectedPromptId,
        details: ipoDetails.trim() || undefined,
      });
      setAnalysisResult(res);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.response?.data?.message || 'Could not analyze IPO');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header & Segments */}
      <View className="px-4 pt-3 pb-2 border-b border-border bg-card">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-text">Investments</Text>
          {activeSegment === 'Portfolio' && (
            <TouchableOpacity
              onPress={() => setTxModalVisible(true)}
              className="bg-primary px-3 py-1.5 rounded-lg flex-row items-center gap-1"
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text className="text-white font-medium text-xs">Transaction</Text>
            </TouchableOpacity>
          )}
          {activeSegment === 'Watchlist' && (
            <TouchableOpacity
              onPress={() => setWlModalVisible(true)}
              className="bg-primary px-3 py-1.5 rounded-lg flex-row items-center gap-1"
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text className="text-white font-medium text-xs">Add Symbol</Text>
            </TouchableOpacity>
          )}
          {activeSegment === 'IPO' && (
            <TouchableOpacity
              onPress={() => {
                setAnalysisResult(null);
                setAnalyzeModalVisible(true);
              }}
              className="bg-accent px-3 py-1.5 rounded-lg flex-row items-center gap-1"
            >
              <Ionicons name="sparkles" size={16} color="#ffffff" />
              <Text className="text-white font-semibold text-xs">Analyze IPO</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Selector */}
        <View className="flex-row bg-background rounded-lg p-1 border border-border">
          {(['Portfolio', 'Watchlist', 'IPO'] as Segment[]).map((segment) => (
            <TouchableOpacity
              key={segment}
              onPress={() => setActiveSegment(segment)}
              className={`flex-1 py-2 items-center rounded-md ${
                activeSegment === segment ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`font-semibold text-xs ${
                  activeSegment === segment ? 'text-white' : 'text-textSecondary'
                }`}
              >
                {segment === 'IPO' ? 'IPO AI Analysis' : segment}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Scroll Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-textSecondary mt-2">Loading {activeSegment}...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 p-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* SEGMENT 1: PORTFOLIO */}
          {activeSegment === 'Portfolio' && (
            <View className="gap-4 pb-12">
              {/* Portfolio Summary Card */}
              <View className="bg-card p-4 rounded-xl border border-border">
                <Text className="text-textSecondary text-xs font-medium">TOTAL PORTFOLIO VALUE</Text>
                <Text className="text-3xl font-bold text-text mt-1">
                  {formatCurrency(portfolio?.total_current_value || 0)}
                </Text>

                <View className="flex-row justify-between mt-4 pt-3 border-t border-border">
                  <View>
                    <Text className="text-textSecondary text-xs">Invested</Text>
                    <Text className="text-text font-semibold text-sm">
                      {formatCurrency(portfolio?.total_invested || 0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-textSecondary text-xs">Total Returns</Text>
                    <Text
                      className={`font-semibold text-sm ${
                        (portfolio?.total_unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {(portfolio?.total_unrealized_pnl || 0) >= 0 ? '+' : ''}
                      {formatCurrency(portfolio?.total_unrealized_pnl || 0)} (
                      {formatPercentage(portfolio?.total_unrealized_pnl_pct || 0)})
                    </Text>
                  </View>
                  <View>
                    <Text className="text-textSecondary text-xs">Today's P&L</Text>
                    <Text
                      className={`font-semibold text-sm ${
                        (portfolio?.total_day_pnl || 0) >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {(portfolio?.total_day_pnl || 0) >= 0 ? '+' : ''}
                      {formatCurrency(portfolio?.total_day_pnl || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Holdings Section */}
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-base font-bold text-text">Holdings ({portfolio?.holdings.length || 0})</Text>
              </View>

              {(!portfolio?.holdings || portfolio.holdings.length === 0) ? (
                <View className="bg-card p-6 rounded-xl border border-border items-center justify-center">
                  <Ionicons name="trending-up-outline" size={48} color="#64748b" />
                  <Text className="text-text font-semibold text-base mt-2">No Holdings Yet</Text>
                  <Text className="text-textSecondary text-xs text-center mt-1">
                    Tap "+ Transaction" above to log your first stock or mutual fund purchase.
                  </Text>
                </View>
              ) : (
                portfolio.holdings.map((h) => (
                  <View key={h.id} className="bg-card p-4 rounded-xl border border-border">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-text font-bold text-base">{h.asset.symbol}</Text>
                          <View className="bg-background px-1.5 py-0.5 rounded border border-border">
                            <Text className="text-[10px] text-textSecondary font-semibold">{h.asset.asset_type}</Text>
                          </View>
                        </View>
                        <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
                          {h.asset.name}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-text font-bold text-base">
                          {formatCurrency(h.current_value)}
                        </Text>
                        <Text
                          className={`text-xs font-semibold ${
                            h.unrealized_pnl >= 0 ? 'text-success' : 'text-danger'
                          }`}
                        >
                          {h.unrealized_pnl >= 0 ? '+' : ''}
                          {formatCurrency(h.unrealized_pnl)} ({formatPercentage(h.unrealized_pnl_pct)})
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-3 pt-2 border-t border-border">
                      <Text className="text-textSecondary text-xs">
                        Qty: <Text className="text-text font-semibold">{h.quantity}</Text> • Avg:{' '}
                        <Text className="text-text font-semibold">{formatCurrency(h.average_buy_price)}</Text>
                      </Text>
                      <Text className="text-textSecondary text-xs">
                        LTP: <Text className="text-text font-semibold">{formatCurrency(h.asset.current_price)}</Text>
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SEGMENT 2: WATCHLIST */}
          {activeSegment === 'Watchlist' && (
            <View className="gap-3 pb-12">
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-bold text-text">Tracked Symbols ({watchlist.length})</Text>
              </View>

              {watchlist.length === 0 ? (
                <View className="bg-card p-6 rounded-xl border border-border items-center justify-center">
                  <Ionicons name="eye-outline" size={48} color="#64748b" />
                  <Text className="text-text font-semibold text-base mt-2">Watchlist Empty</Text>
                  <Text className="text-textSecondary text-xs text-center mt-1">
                    Add stocks or indices (e.g. TATAMOTORS.NS, INFY.NS) to monitor live prices.
                  </Text>
                </View>
              ) : (
                watchlist.map((item) => (
                  <View key={item.id} className="bg-card p-4 rounded-xl border border-border">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-text font-bold text-base">{item.asset.symbol}</Text>
                          <Text className="text-[10px] bg-background px-1.5 py-0.5 rounded text-textSecondary font-semibold border border-border">
                            {item.asset.exchange}
                          </Text>
                        </View>
                        <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
                          {item.asset.name}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-text font-bold text-base">
                          {formatCurrency(item.asset.current_price)}
                        </Text>
                        {item.asset.day_change_pct !== undefined && (
                          <Text
                            className={`text-xs font-semibold ${
                              item.asset.day_change_pct >= 0 ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {item.asset.day_change_pct >= 0 ? '+' : ''}
                            {formatPercentage(item.asset.day_change_pct)}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-3 pt-2 border-t border-border">
                      {item.target_price ? (
                        <Text className="text-accent text-xs">
                          Target Alert: {formatCurrency(item.target_price)}
                        </Text>
                      ) : (
                        <Text className="text-textSecondary text-xs">No alert set</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveWatchlist(item.id)}
                        className="p-1"
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SEGMENT 3: IPO & CUSTOM SYSTEM PROMPTS */}
          {activeSegment === 'IPO' && (
            <View className="gap-4 pb-12">
              {/* Banner */}
              <View className="bg-card p-4 rounded-xl border border-border">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="bulb-outline" size={20} color="#6366f1" />
                  <Text className="text-text font-bold text-base">Custom IPO Evaluation Prompts</Text>
                </View>
                <Text className="text-textSecondary text-xs leading-5">
                  Customize the system prompts used by the AI to analyze upcoming IPOs. You can create different analysis strategies (e.g. GMP focus, Long-term fundamentals, or Listing gains).
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingPromptId(null);
                    setPromptName('');
                    setPromptContent('');
                    setPromptIsDefault(false);
                    setPromptModalVisible(true);
                  }}
                  className="mt-3 bg-primary/20 border border-primary px-3 py-2 rounded-lg items-center"
                >
                  <Text className="text-primary font-semibold text-xs">+ Add New Analysis Prompt</Text>
                </TouchableOpacity>
              </View>

              {/* List of Prompts */}
              <Text className="text-base font-bold text-text">Your Analysis Prompts ({prompts.length})</Text>

              {prompts.map((p) => (
                <View key={p.id} className="bg-card p-4 rounded-xl border border-border">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-text font-bold text-base">{p.name}</Text>
                      {p.is_default && (
                        <View className="bg-success/20 px-2 py-0.5 rounded-full border border-success">
                          <Text className="text-success text-[10px] font-bold">DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          setEditingPromptId(p.id);
                          setPromptName(p.name);
                          setPromptContent(p.prompt_content);
                          setPromptIsDefault(p.is_default);
                          setPromptModalVisible(true);
                        }}
                      >
                        <Ionicons name="pencil" size={18} color="#6366f1" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePrompt(p.id, p.name)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text className="text-textSecondary text-xs mt-2 bg-background p-2.5 rounded-lg font-mono" numberOfLines={4}>
                    {p.prompt_content}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL 1: ADD TRANSACTION */}
      <Modal visible={txModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">Record Investment</Text>
              <TouchableOpacity onPress={() => setTxModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Buy / Sell Toggle */}
            <View className="flex-row bg-background rounded-lg p-1 border border-border mb-3">
              <TouchableOpacity
                onPress={() => setTxType('BUY')}
                className={`flex-1 py-2 items-center rounded ${txType === 'BUY' ? 'bg-success' : 'bg-transparent'}`}
              >
                <Text className={`font-bold text-xs ${txType === 'BUY' ? 'text-white' : 'text-textSecondary'}`}>BUY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTxType('SELL')}
                className={`flex-1 py-2 items-center rounded ${txType === 'SELL' ? 'bg-danger' : 'bg-transparent'}`}
              >
                <Text className={`font-bold text-xs ${txType === 'SELL' ? 'text-white' : 'text-textSecondary'}`}>SELL</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Ticker / Symbol (e.g. RELIANCE.NS)</Text>
            <TextInput
              value={txSymbol}
              onChangeText={setTxSymbol}
              placeholder="e.g. INFY.NS or 119598 (AMFI code)"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-3"
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Quantity</Text>
                <TextInput
                  value={txQty}
                  onChangeText={setTxQty}
                  placeholder="e.g. 10"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Price per Share (₹)</Text>
                <TextInput
                  value={txPrice}
                  onChangeText={setTxPrice}
                  placeholder="e.g. 2450.00"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreateTransaction}
              disabled={txSubmitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {txSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Transaction</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD TO WATCHLIST */}
      <Modal visible={wlModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">Add to Watchlist</Text>
              <TouchableOpacity onPress={() => setWlModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Symbol (e.g. TCS.NS, NIFTY50.NS)</Text>
            <TextInput
              value={wlSymbol}
              onChangeText={setWlSymbol}
              placeholder="e.g. HDFCBANK.NS"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-3"
            />

            <Text className="text-textSecondary text-xs mb-1">Target Price Alert (Optional ₹)</Text>
            <TextInput
              value={wlTargetPrice}
              onChangeText={setWlTargetPrice}
              placeholder="e.g. 1500"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-4"
            />

            <TouchableOpacity
              onPress={handleAddToWatchlist}
              disabled={wlSubmitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {wlSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Add Symbol</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ADD/EDIT IPO PROMPT */}
      <Modal visible={promptModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">
                {editingPromptId ? 'Edit Analysis Prompt' : 'New IPO Prompt'}
              </Text>
              <TouchableOpacity onPress={() => setPromptModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Prompt Name</Text>
            <TextInput
              value={promptName}
              onChangeText={setPromptName}
              placeholder="e.g. Listing Gains & GMP Strategy"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
            />

            <Text className="text-textSecondary text-xs mb-1">Prompt System Instructions</Text>
            <TextInput
              value={promptContent}
              onChangeText={setPromptContent}
              placeholder="Define exactly what the AI should evaluate (valuation, GMP, risk, verdict: APPLY / AVOID)..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-3 h-32"
            />

            <TouchableOpacity
              onPress={() => setPromptIsDefault(!promptIsDefault)}
              className="flex-row items-center gap-2 mb-4"
            >
              <Ionicons
                name={promptIsDefault ? 'checkbox' : 'square-outline'}
                size={20}
                color={promptIsDefault ? '#6366f1' : '#94a3b8'}
              />
              <Text className="text-text text-sm">Set as default IPO analysis prompt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSavePrompt}
              disabled={promptSubmitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {promptSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Prompt</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: RUN IPO AI ANALYSIS */}
      <Modal visible={analyzeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border max-h-[90%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="sparkles" size={20} color="#f59e0b" />
                <Text className="text-lg font-bold text-text">AI IPO Evaluation</Text>
              </View>
              <TouchableOpacity onPress={() => setAnalyzeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {!analysisResult ? (
              <ScrollView>
                <Text className="text-textSecondary text-xs mb-1">Select Analysis System Prompt</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-3">
                  {prompts.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedPromptId(p.id)}
                      className={`px-3 py-1.5 rounded-lg border ${
                        selectedPromptId === p.id
                          ? 'bg-primary border-primary'
                          : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selectedPromptId === p.id ? 'text-white' : 'text-textSecondary'
                        }`}
                      >
                        {p.name} {p.is_default ? '★' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text className="text-textSecondary text-xs mb-1">IPO / Company Name</Text>
                <TextInput
                  value={ipoName}
                  onChangeText={setIpoName}
                  placeholder="e.g. Swiggy, Hyundai India, Ola Electric"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-3"
                />

                <Text className="text-textSecondary text-xs mb-1">Financial Highlights / GMP Notes (Optional)</Text>
                <TextInput
                  value={ipoDetails}
                  onChangeText={setIpoDetails}
                  placeholder="e.g. Issue size 10,000 Cr, Price band ₹370-390, GMP ~15%, P/E 45"
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text mb-4 h-24"
                />

                <TouchableOpacity
                  onPress={handleRunAnalysis}
                  disabled={analyzing}
                  className="bg-accent py-3 rounded-xl items-center flex-row justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text className="text-white font-bold text-base">Analyzing with AI...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#ffffff" />
                      <Text className="text-white font-bold text-base">Generate Evaluation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView className="max-h-[80%]">
                <View className="bg-background p-3 rounded-lg border border-border mb-3">
                  <Text className="text-text font-bold text-lg">{analysisResult.ipo_name}</Text>
                  <Text className="text-primary text-xs font-semibold mt-0.5">
                    Evaluated with: {analysisResult.used_prompt_name}
                  </Text>
                </View>

                <View className="bg-background p-4 rounded-xl border border-border mb-4">
                  <Text className="text-text text-sm leading-6">
                    {analysisResult.analysis_markdown}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setAnalysisResult(null)}
                  className="bg-primary py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-sm">Analyze Another IPO</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
