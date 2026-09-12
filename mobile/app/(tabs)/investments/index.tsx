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
  StockSuggestion,
  StockSearchItem,
  UpcomingIPOItem,
} from '../../../src/types/investment';
import { formatCurrency, formatPercentage } from '../../../src/utils/formatting';

type Segment = 'Portfolio' | 'Suggestions' | 'Watchlist' | 'IPO';

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

  // Holding Edit state
  const [editHoldingModalVisible, setEditHoldingModalVisible] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [editHoldingQty, setEditHoldingQty] = useState('');
  const [editHoldingAvgPrice, setEditHoldingAvgPrice] = useState('');
  const [editHoldingNotes, setEditHoldingNotes] = useState('');
  const [editHoldingSubmitting, setEditHoldingSubmitting] = useState(false);

  // Suggestions & Search state
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [wlModalVisible, setWlModalVisible] = useState(false);
  const [wlSymbol, setWlSymbol] = useState('');
  const [wlTargetPrice, setWlTargetPrice] = useState('');
  const [wlSubmitting, setWlSubmitting] = useState(false);

  // Autocomplete state for Add Transaction Modal
  const [txSuggestions, setTxSuggestions] = useState<StockSearchItem[]>([]);
  const [isTxSearching, setIsTxSearching] = useState(false);

  // Autocomplete state for Watchlist Modal
  const [wlSuggestions, setWlSuggestions] = useState<StockSearchItem[]>([]);
  const [isWlSearching, setIsWlSearching] = useState(false);

  // IPO state
  const [prompts, setPrompts] = useState<IPOPrompt[]>([]);
  const [upcomingIPOs, setUpcomingIPOs] = useState<UpcomingIPOItem[]>([]);
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

  const loadData = useCallback(async (catOverride?: string) => {
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
      } else if (activeSegment === 'Suggestions') {
        const activeCat = catOverride !== undefined ? catOverride : selectedCategory;
        const catParam = activeCat === 'ALL' ? undefined : activeCat;
        const suggData = await investmentApi.getStockSuggestions(catParam);
        setSuggestions(suggData);
      } else if (activeSegment === 'Watchlist') {
        const wlData = await investmentApi.getWatchlist();
        setWatchlist(wlData);
      } else if (activeSegment === 'IPO') {
        const [promptsData, iposData] = await Promise.all([
          investmentApi.getIPOPrompts(),
          investmentApi.getUpcomingIPOs(),
        ]);
        setPrompts(promptsData);
        setUpcomingIPOs(iposData);
        const defPrompt = promptsData.find((p) => p.is_default);
        if (defPrompt) {
          setSelectedPromptId(defPrompt.id);
        } else if (promptsData.length > 0) {
          setSelectedPromptId(promptsData[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load investments data:', err);
    }
  }, [activeSegment, txAccount, selectedCategory]);

  // Holding Edit/Delete Handlers
  const handleOpenEditHolding = (h: Holding) => {
    setEditingHolding(h);
    setEditHoldingQty(String(h.quantity));
    setEditHoldingAvgPrice(String(h.average_buy_price));
    setEditHoldingModalVisible(true);
  };

  const handleSaveEditHolding = async () => {
    if (!editingHolding) return;
    const qty = parseFloat(editHoldingQty);
    const avg = parseFloat(editHoldingAvgPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(avg) || avg <= 0) {
      Alert.alert('Validation Error', 'Please enter valid positive numbers for quantity and average buy price.');
      return;
    }
    setEditHoldingSubmitting(true);
    try {
      await investmentApi.updateHolding(editingHolding.id, {
        quantity: qty,
        average_buy_price: avg,
        notes: editHoldingNotes.trim() || undefined,
      });
      setEditHoldingModalVisible(false);
      setEditingHolding(null);
      await loadData();
      Alert.alert('Success', 'Holding updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update holding');
    } finally {
      setEditHoldingSubmitting(false);
    }
  };

  const handleDeleteHolding = (h: Holding) => {
    Alert.alert(
      'Remove Stock Holding',
      `Are you sure you want to remove ${h.asset.symbol} (${h.quantity} shares) from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update for instant UI response
            setPortfolio((prev) => {
              if (!prev) return prev;
              const filtered = prev.holdings.filter((item) => item.id !== h.id);
              const totalVal = filtered.reduce((acc, curr) => acc + curr.current_value, 0);
              const totalInv = filtered.reduce((acc, curr) => acc + curr.total_invested, 0);
              const totalPnl = totalVal - totalInv;
              const totalPnlPct = totalInv > 0 ? (totalPnl / totalInv) * 100 : 0;
              const totalDayPnl = filtered.reduce((acc, curr) => acc + curr.day_pnl, 0);
              return {
                ...prev,
                holdings: filtered,
                total_current_value: totalVal,
                total_invested: totalInv,
                total_unrealized_pnl: totalPnl,
                total_unrealized_pnl_pct: totalPnlPct,
                total_day_pnl: totalDayPnl,
              };
            });
            setEditHoldingModalVisible(false);
            setEditingHolding(null);
            try {
              await investmentApi.deleteHolding(h.id);
              await loadData();
              Alert.alert('Removed', `${h.asset.symbol} holding removed.`);
            } catch (e: any) {
              await loadData();
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete holding');
            }
          },
        },
      ]
    );
  };

  // Quick Action Handlers for Suggestions
  const handleQuickBuy = (symbol: string, name?: string, price?: number, type: 'BUY' | 'SELL' = 'BUY') => {
    setTxSymbol(symbol);
    setTxType(type);
    if (price) {
      setTxPrice(String(price));
    }
    setTxQty('');
    setTxModalVisible(true);
  };

  const handleAddToWatchlistFromSuggestion = async (symbol: string, name?: string, targetPrice?: number) => {
    try {
      await investmentApi.addToWatchlist({
        symbol,
        name,
        target_price: targetPrice,
      });
      Alert.alert('Watchlist', `${symbol} added to your watchlist!`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add to watchlist');
    }
  };

  // Autocomplete Handlers for Add Transaction Modal
  const handleTxSymbolChange = async (text: string) => {
    setTxSymbol(text);
    if (!text.trim() || text.trim().length < 2) {
      setTxSuggestions([]);
      return;
    }
    setIsTxSearching(true);
    try {
      const results = await investmentApi.searchStocks(text.trim());
      setTxSuggestions(results);
    } catch (e) {
      console.warn('TX stock search failed:', e);
    } finally {
      setIsTxSearching(false);
    }
  };

  const handleSelectTxSuggestion = (stock: StockSearchItem) => {
    setTxSymbol(stock.symbol);
    if (stock.current_price) {
      setTxPrice(String(stock.current_price));
    }
    setTxSuggestions([]);
  };

  // Autocomplete Handlers for Watchlist Modal
  const handleWlSymbolChange = async (text: string) => {
    setWlSymbol(text);
    if (!text.trim() || text.trim().length < 2) {
      setWlSuggestions([]);
      return;
    }
    setIsWlSearching(true);
    try {
      const results = await investmentApi.searchStocks(text.trim());
      setWlSuggestions(results);
    } catch (e) {
      console.warn('WL stock search failed:', e);
    } finally {
      setIsWlSearching(false);
    }
  };

  const handleSelectWlSuggestion = (stock: StockSearchItem) => {
    setWlSymbol(stock.symbol);
    if (stock.current_price) {
      setWlTargetPrice(String(stock.current_price));
    }
    setWlSuggestions([]);
  };

  // 1-Tap IPO AI Evaluation
  const handleEvaluateIPO = (ipo: UpcomingIPOItem) => {
    setIpoName(ipo.company_name);
    const details = [
      ipo.price_band ? `Price Band: ${ipo.price_band}` : '',
      ipo.issue_size ? `Issue Size: ${ipo.issue_size}` : '',
      ipo.expected_gmp ? `GMP: ${ipo.expected_gmp}` : '',
      ipo.sector ? `Sector: ${ipo.sector}` : '',
      ipo.listing_date ? `Listing Date: ${ipo.listing_date}` : '',
      ipo.description ? `Note: ${ipo.description}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    setIpoDetails(details);
    setAnalysisResult(null);
    setAnalyzeModalVisible(true);
  };

  // Search Stocks Handler
  const handleSearchTextChange = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await investmentApi.searchStocks(text.trim());
      setSearchResults(results);
    } catch (e) {
      console.warn('Search stocks failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Category select for stock suggestions
  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    loadData(cat);
  };

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
              <Text className="text-white font-medium text-xs">Add Stock</Text>
            </TouchableOpacity>
          )}
          {activeSegment === 'Suggestions' && (
            <View className="bg-primary/20 px-2.5 py-1 rounded-full border border-primary flex-row items-center gap-1">
              <Ionicons name="sparkles" size={13} color="#6366f1" />
              <Text className="text-primary text-[11px] font-bold">Top Stock Ideas</Text>
            </View>
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
          {(['Portfolio', 'Suggestions', 'Watchlist', 'IPO'] as Segment[]).map((segment) => (
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
                {segment === 'IPO' ? 'IPO AI' : segment}
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

                    {/* Holding Action Buttons */}
                    <View className="flex-row justify-end items-center gap-2 mt-3 pt-2 border-t border-border/60">
                      <TouchableOpacity
                        onPress={() => handleQuickBuy(h.asset.symbol, h.asset.name, h.asset.current_price, 'BUY')}
                        className="bg-success/15 px-2.5 py-1 rounded border border-success/30 flex-row items-center gap-1"
                      >
                        <Ionicons name="add" size={13} color="#22c55e" />
                        <Text className="text-success text-xs font-semibold">Buy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleQuickBuy(h.asset.symbol, h.asset.name, h.asset.current_price, 'SELL')}
                        className="bg-danger/15 px-2.5 py-1 rounded border border-danger/30 flex-row items-center gap-1"
                      >
                        <Ionicons name="remove" size={13} color="#ef4444" />
                        <Text className="text-danger text-xs font-semibold">Sell</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOpenEditHolding(h)}
                        className="bg-primary/15 px-2.5 py-1 rounded border border-primary/30 flex-row items-center gap-1"
                      >
                        <Ionicons name="pencil" size={12} color="#6366f1" />
                        <Text className="text-primary text-xs font-semibold">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteHolding(h)}
                        className="bg-card px-2.5 py-1 rounded border border-border flex-row items-center gap-1"
                      >
                        <Ionicons name="trash-outline" size={12} color="#ef4444" />
                        <Text className="text-danger text-xs font-semibold">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Suggestions Discovery Banner */}
              <TouchableOpacity
                onPress={() => setActiveSegment('Suggestions')}
                className="bg-card p-4 rounded-xl border border-primary/40 flex-row items-center justify-between mt-1"
              >
                <View className="flex-row items-center gap-3 flex-1 mr-2">
                  <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center border border-primary/30">
                    <Ionicons name="sparkles" size={18} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text font-bold text-sm">Discover Stock Suggestions</Text>
                    <Text className="text-textSecondary text-xs mt-0.5">Explore curated NIFTY 50, Growth, Green Energy & Dividend picks</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}

          {/* SEGMENT 2: STOCK SUGGESTIONS & SEARCH */}
          {activeSegment === 'Suggestions' && (
            <View className="gap-4 pb-12">
              {/* Search Bar */}
              <View className="bg-card p-3 rounded-xl border border-border">
                <View className="flex-row items-center bg-background border border-border rounded-lg px-3 py-2">
                  <Ionicons name="search-outline" size={18} color="#64748b" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={handleSearchTextChange}
                    placeholder="Search any Indian stock (e.g. RELIANCE, TCS)..."
                    placeholderTextColor="#64748b"
                    className="flex-1 text-text ml-2 text-xs py-0"
                    autoCapitalize="characters"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                  {isSearching && (
                    <ActivityIndicator size="small" color="#6366f1" className="ml-1" />
                  )}
                </View>

                {/* Instant Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <View className="mt-2 pt-2 border-t border-border gap-2">
                    <Text className="text-[11px] font-bold text-textSecondary uppercase">
                      Search Results ({searchResults.length})
                    </Text>
                    {searchResults.map((item) => (
                      <View
                        key={item.symbol}
                        className="bg-background p-2.5 rounded-lg border border-border flex-row justify-between items-center"
                      >
                        <View className="flex-1 mr-2">
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-text font-bold text-xs">{item.symbol}</Text>
                            <Text className="text-[9px] bg-card px-1 py-0.5 rounded text-textSecondary font-semibold">
                              {item.exchange}
                            </Text>
                          </View>
                          <Text className="text-textSecondary text-[11px]" numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <TouchableOpacity
                            onPress={() => handleAddToWatchlistFromSuggestion(item.symbol, item.name)}
                            className="bg-card px-2 py-1 rounded border border-border flex-row items-center gap-1"
                          >
                            <Ionicons name="eye-outline" size={12} color="#6366f1" />
                            <Text className="text-primary text-[10px] font-bold">Watch</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleQuickBuy(item.symbol, item.name)}
                            className="bg-primary px-2.5 py-1 rounded flex-row items-center gap-1"
                          >
                            <Ionicons name="add" size={12} color="#ffffff" />
                            <Text className="text-white text-[10px] font-bold">+ Buy</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {[
                  { id: 'ALL', label: 'All Ideas' },
                  { id: 'NIFTY 50', label: 'NIFTY 50' },
                  { id: 'HIGH GROWTH', label: 'High Growth' },
                  { id: 'GREEN ENERGY', label: 'Green Energy' },
                  { id: 'DIVIDEND', label: 'Dividend' },
                  { id: 'DEFENSIVE', label: 'Defensive' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleCategorySelect(c.id)}
                    className={`px-3.5 py-2 rounded-full border ${
                      selectedCategory === c.id
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedCategory === c.id ? 'text-white' : 'text-textSecondary'
                      }`}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Suggestions Cards Header */}
              <View className="flex-row justify-between items-center flex-wrap gap-1">
                <Text className="text-base font-bold text-text">
                  {searchQuery.trim()
                    ? `Matching Ideas`
                    : selectedCategory === 'ALL'
                    ? 'Curated Opportunities'
                    : `${selectedCategory} Picks`}{' '}
                  (
                  {
                    suggestions.filter((s) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().trim();
                      return (
                        s.symbol.toLowerCase().includes(q) ||
                        s.name.toLowerCase().includes(q) ||
                        s.sector.toLowerCase().includes(q) ||
                        s.category.toLowerCase().includes(q)
                      );
                    }).length
                  }
                  )
                </Text>
                <Text className="text-xs text-textSecondary">Tap to buy or track</Text>
              </View>

              {/* Suggestions Cards List */}
              {(() => {
                const filteredSuggestions = suggestions.filter((s) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  return (
                    s.symbol.toLowerCase().includes(q) ||
                    s.name.toLowerCase().includes(q) ||
                    s.sector.toLowerCase().includes(q) ||
                    s.category.toLowerCase().includes(q)
                  );
                });

                if (filteredSuggestions.length === 0 && searchResults.length === 0) {
                  return (
                    <View className="bg-card p-6 rounded-xl border border-border items-center justify-center">
                      <Ionicons name="sparkles-outline" size={40} color="#64748b" />
                      <Text className="text-text font-semibold text-sm mt-2">No Suggestions Found</Text>
                      <Text className="text-textSecondary text-xs text-center mt-1">
                        {searchQuery.trim()
                          ? `No ideas matching "${searchQuery}". Try a different ticker like RELIANCE, TCS or TATA.`
                          : 'Try selecting another category or pull to refresh.'}
                      </Text>
                    </View>
                  );
                }

                return filteredSuggestions.map((s) => (
                  <View key={s.symbol} className="bg-card p-4 rounded-xl border border-border">
                    {/* Top Row: Symbol, Tag, Price & Change */}
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-text font-bold text-base">{s.symbol}</Text>
                          <View className="bg-primary/15 px-2 py-0.5 rounded border border-primary/30">
                            <Text className="text-[10px] text-primary font-bold">{s.tag}</Text>
                          </View>
                        </View>
                        <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
                          {s.name} • {s.sector}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-text font-bold text-base">
                          {formatCurrency(s.current_price)}
                        </Text>
                        {s.day_change_pct !== undefined && (
                          <Text
                            className={`text-xs font-semibold ${
                              s.day_change_pct >= 0 ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {s.day_change_pct >= 0 ? '+' : ''}
                            {formatPercentage(s.day_change_pct)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Rationale Callout Box */}
                    <View className="bg-background p-2.5 rounded-lg border border-border mt-3">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Ionicons name="bulb-outline" size={13} color="#f59e0b" />
                        <Text className="text-[11px] font-bold text-accent">Investment Thesis</Text>
                        <Text className="text-[10px] text-textSecondary">• {s.category}</Text>
                      </View>
                      <Text className="text-textSecondary text-xs leading-4">
                        {s.rationale}
                      </Text>
                    </View>

                    {/* Quick Action Footer */}
                    <View className="flex-row justify-between items-center mt-3 pt-2.5 border-t border-border">
                      <TouchableOpacity
                        onPress={() => handleAddToWatchlistFromSuggestion(s.symbol, s.name)}
                        className="bg-card px-3 py-1.5 rounded-lg border border-border flex-row items-center gap-1.5"
                      >
                        <Ionicons name="star-outline" size={14} color="#6366f1" />
                        <Text className="text-text text-xs font-medium">Watchlist</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleQuickBuy(s.symbol, s.name, s.current_price, 'BUY')}
                        className="bg-primary px-3.5 py-1.5 rounded-lg flex-row items-center gap-1.5"
                      >
                        <Ionicons name="add-circle-outline" size={15} color="#ffffff" />
                        <Text className="text-white text-xs font-bold">Add to Portfolio</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ));
              })()}
            </View>
          )}

          {/* SEGMENT 3: WATCHLIST */}
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

          {/* SEGMENT 4: IPO AI */}
          {activeSegment === 'IPO' && (
            <View className="gap-4 pb-12">
              {/* Upcoming IPOs Header */}
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-bold text-text">
                    Upcoming IPOs ({upcomingIPOs.length})
                  </Text>
                  <Text className="text-xs text-textSecondary mt-0.5">
                    Companies listing soon on NSE / BSE
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIpoName('');
                    setIpoDetails('');
                    setAnalysisResult(null);
                    setAnalyzeModalVisible(true);
                  }}
                  className="bg-accent px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                >
                  <Ionicons name="sparkles" size={13} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">Custom AI Check</Text>
                </TouchableOpacity>
              </View>

              {/* Upcoming IPOs List */}
              {upcomingIPOs.length === 0 ? (
                <View className="bg-card p-6 rounded-xl border border-border items-center justify-center">
                  <Ionicons name="newspaper-outline" size={40} color="#64748b" />
                  <Text className="text-text font-semibold text-sm mt-2">No Upcoming IPOs Found</Text>
                  <Text className="text-textSecondary text-xs text-center mt-1">
                    Pull down to refresh or check back later for newly announced issues.
                  </Text>
                </View>
              ) : (
                upcomingIPOs.map((ipo) => (
                  <View key={ipo.id} className="bg-card p-4 rounded-xl border border-border">
                    {/* Top Row: Company Name, Symbol, Status & GMP */}
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-text font-bold text-base">{ipo.company_name}</Text>
                          {ipo.symbol && (
                            <View className="bg-background px-1.5 py-0.5 rounded border border-border">
                              <Text className="text-[10px] text-textSecondary font-semibold">
                                {ipo.symbol}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-textSecondary text-xs mt-0.5">
                          {ipo.sector || 'Mainboard Issue'}
                        </Text>
                      </View>

                      <View className="items-end gap-1">
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            ipo.status === 'Open'
                              ? 'bg-success/20 border border-success'
                              : 'bg-primary/20 border border-primary'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              ipo.status === 'Open' ? 'text-success' : 'text-primary'
                            }`}
                          >
                            {ipo.status}
                          </Text>
                        </View>
                        {ipo.expected_gmp && (
                          <View className="bg-success/15 px-2 py-0.5 rounded border border-success/30">
                            <Text className="text-[10px] text-success font-bold">
                              GMP {ipo.expected_gmp}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Issue Parameters Box */}
                    <View className="bg-background p-2.5 rounded-lg border border-border mt-3 flex-row justify-between">
                      <View>
                        <Text className="text-textSecondary text-[10px] font-medium">Price Band</Text>
                        <Text className="text-text text-xs font-bold mt-0.5">
                          {ipo.price_band || 'TBA'}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-textSecondary text-[10px] font-medium">Issue Size</Text>
                        <Text className="text-text text-xs font-bold mt-0.5">
                          {ipo.issue_size || 'TBA'}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-textSecondary text-[10px] font-medium">Listing Date</Text>
                        <Text className="text-text text-xs font-bold mt-0.5">
                          {ipo.listing_date || 'Upcoming'}
                        </Text>
                      </View>
                    </View>

                    {ipo.description && (
                      <Text className="text-textSecondary text-xs mt-2.5 leading-4" numberOfLines={2}>
                        {ipo.description}
                      </Text>
                    )}

                    {/* Bottom Action Row */}
                    <View className="flex-row justify-between items-center mt-3 pt-2.5 border-t border-border">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                        <Text className="text-[11px] text-textSecondary">
                          {ipo.open_date && ipo.close_date
                            ? `${ipo.open_date} - ${ipo.close_date}`
                            : 'Dates TBA'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleEvaluateIPO(ipo)}
                        className="bg-accent px-3 py-1.5 rounded-lg flex-row items-center gap-1.5"
                      >
                        <Ionicons name="sparkles" size={13} color="#ffffff" />
                        <Text className="text-white text-xs font-bold">Evaluate with AI</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Custom Prompts Config Accordion/Card */}
              <View className="bg-card p-4 rounded-xl border border-border mt-2">
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="options-outline" size={18} color="#6366f1" />
                    <Text className="text-text font-bold text-sm">AI Evaluation Prompts</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingPromptId(null);
                      setPromptName('');
                      setPromptContent('');
                      setPromptIsDefault(false);
                      setPromptModalVisible(true);
                    }}
                    className="bg-primary/20 border border-primary px-2.5 py-1 rounded-lg"
                  >
                    <Text className="text-primary font-semibold text-[11px]">+ New Prompt</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-textSecondary text-[11px] leading-4 mb-3">
                  Customize the system prompts used by the AI when evaluating IPO metrics.
                </Text>

                {prompts.map((p) => (
                  <View key={p.id} className="bg-background p-3 rounded-lg border border-border mb-2">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-text font-semibold text-xs">{p.name}</Text>
                        {p.is_default && (
                          <View className="bg-success/20 px-1.5 py-0.2 rounded border border-success">
                            <Text className="text-success text-[9px] font-bold">DEFAULT</Text>
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
                          <Ionicons name="pencil" size={15} color="#6366f1" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeletePrompt(p.id, p.name)}>
                          <Ionicons name="trash-outline" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="text-textSecondary text-[11px] mt-1 font-mono" numberOfLines={2}>
                      {p.prompt_content}
                    </Text>
                  </View>
                ))}
              </View>
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
            <View className="relative mb-2">
              <TextInput
                value={txSymbol}
                onChangeText={handleTxSymbolChange}
                placeholder="Type symbol (e.g. INFY, TATA, RELIANCE)..."
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
              />
              {isTxSearching && (
                <ActivityIndicator
                  size="small"
                  color="#6366f1"
                  style={{ position: 'absolute', right: 12, top: 12 }}
                />
              )}
            </View>

            {/* Autocomplete Dropdown */}
            {txSuggestions.length > 0 && (
              <View className="bg-background border border-primary/40 rounded-xl mb-3 p-1.5 max-h-36">
                <Text className="text-[10px] font-bold text-primary px-2 py-1 uppercase">
                  Matching Stocks ({txSuggestions.length})
                </Text>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {txSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.symbol}
                      onPress={() => handleSelectTxSuggestion(item)}
                      className="p-2 border-b border-border/40 flex-row justify-between items-center rounded"
                    >
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-text font-bold text-xs">{item.symbol}</Text>
                          <Text className="text-[9px] bg-card px-1 py-0.5 rounded text-textSecondary">
                            {item.exchange}
                          </Text>
                        </View>
                        <Text className="text-textSecondary text-[11px]" numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      {item.current_price && (
                        <Text className="text-primary font-bold text-xs">₹{item.current_price}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
            <View className="relative mb-2">
              <TextInput
                value={wlSymbol}
                onChangeText={handleWlSymbolChange}
                placeholder="Type symbol (e.g. HDFC, TATA, INFY)..."
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
              />
              {isWlSearching && (
                <ActivityIndicator
                  size="small"
                  color="#6366f1"
                  style={{ position: 'absolute', right: 12, top: 12 }}
                />
              )}
            </View>

            {/* Autocomplete Dropdown */}
            {wlSuggestions.length > 0 && (
              <View className="bg-background border border-primary/40 rounded-xl mb-3 p-1.5 max-h-36">
                <Text className="text-[10px] font-bold text-primary px-2 py-1 uppercase">
                  Matching Stocks ({wlSuggestions.length})
                </Text>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {wlSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.symbol}
                      onPress={() => handleSelectWlSuggestion(item)}
                      className="p-2 border-b border-border/40 flex-row justify-between items-center rounded"
                    >
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-text font-bold text-xs">{item.symbol}</Text>
                          <Text className="text-[9px] bg-card px-1 py-0.5 rounded text-textSecondary">
                            {item.exchange}
                          </Text>
                        </View>
                        <Text className="text-textSecondary text-[11px]" numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      {item.current_price && (
                        <Text className="text-primary font-bold text-xs">₹{item.current_price}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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

      {/* MODAL 5: EDIT HOLDING */}
      <Modal visible={editHoldingModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-lg font-bold text-text">Edit Stock Holding</Text>
                <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
                  {editingHolding?.asset?.symbol} • {editingHolding?.asset?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditHoldingModalVisible(false);
                  setEditingHolding(null);
                }}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="bg-background p-3 rounded-lg border border-border mb-3 flex-row justify-between items-center">
              <View>
                <Text className="text-textSecondary text-[11px]">Current Market Price (LTP)</Text>
                <Text className="text-text font-bold text-sm">
                  {formatCurrency(editingHolding?.asset?.current_price || 0)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-textSecondary text-[11px]">Holding Value</Text>
                <Text className="text-text font-bold text-sm">
                  {formatCurrency(editingHolding?.current_value || 0)}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Quantity (Shares)</Text>
                <TextInput
                  value={editHoldingQty}
                  onChangeText={setEditHoldingQty}
                  placeholder="e.g. 25"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Average Buy Price (₹)</Text>
                <TextInput
                  value={editHoldingAvgPrice}
                  onChangeText={setEditHoldingAvgPrice}
                  placeholder="e.g. 1540.00"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2.5 text-text"
                />
              </View>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Notes (Optional)</Text>
            <TextInput
              value={editHoldingNotes}
              onChangeText={setEditHoldingNotes}
              placeholder="e.g. Long term SIP, target ₹2000"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
            />

            <View className="bg-background/80 p-2.5 rounded-lg border border-border mb-4 flex-row justify-between items-center">
              <Text className="text-textSecondary text-xs">Recalculated Invested Value:</Text>
              <Text className="text-text font-bold text-sm">
                {formatCurrency(
                  (parseFloat(editHoldingQty) || 0) * (parseFloat(editHoldingAvgPrice) || 0)
                )}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveEditHolding}
              disabled={editHoldingSubmitting}
              className="bg-primary py-3 rounded-xl items-center mb-2"
            >
              {editHoldingSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Changes</Text>
              )}
            </TouchableOpacity>

            {editingHolding && (
              <TouchableOpacity
                onPress={() => handleDeleteHolding(editingHolding)}
                disabled={editHoldingSubmitting}
                className="bg-danger/15 border border-danger/30 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5"
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text className="text-danger font-bold text-sm">Delete Stock from Portfolio</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
