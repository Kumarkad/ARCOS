import api from './client';
import { ApiResponse } from '../types/api';
import {
  InvestmentAccount,
  PortfolioSummary,
  Holding,
  HoldingUpdatePayload,
  StockSuggestion,
  StockSearchItem,
  InvestmentTransaction,
  TransactionCreatePayload,
  WatchlistItem,
  WatchlistCreatePayload,
  IPOPrompt,
  IPOPromptCreatePayload,
  IPOPromptUpdatePayload,
  IPOAnalyzeRequest,
  IPOAnalyzeResult,
} from '../types/investment';

export const investmentApi = {
  // Accounts
  getAccounts: async (): Promise<InvestmentAccount[]> => {
    const res = await api.get<ApiResponse<InvestmentAccount[]>>('/investments/accounts');
    return res.data.data;
  },

  createAccount: async (payload: { name: string; broker_name: string; account_type?: string }): Promise<InvestmentAccount> => {
    const res = await api.post<ApiResponse<InvestmentAccount>>('/investments/accounts', payload);
    return res.data.data;
  },

  // Portfolio
  getPortfolio: async (): Promise<PortfolioSummary> => {
    const res = await api.get<ApiResponse<PortfolioSummary>>('/investments/portfolio');
    return res.data.data;
  },

  updateHolding: async (holdingId: string, payload: HoldingUpdatePayload): Promise<Holding> => {
    const res = await api.put<ApiResponse<Holding>>(`/investments/holdings/${holdingId}`, payload);
    return res.data.data;
  },

  deleteHolding: async (holdingId: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/investments/holdings/${holdingId}`);
    return res.data.data;
  },

  // Stock Suggestions & Search
  getStockSuggestions: async (category?: string): Promise<StockSuggestion[]> => {
    const url = category ? `/investments/suggestions?category=${encodeURIComponent(category)}` : '/investments/suggestions';
    const res = await api.get<ApiResponse<StockSuggestion[]>>(url);
    return res.data.data;
  },

  searchStocks: async (query: string): Promise<StockSearchItem[]> => {
    const res = await api.get<ApiResponse<StockSearchItem[]>>(`/investments/search?query=${encodeURIComponent(query)}`);
    return res.data.data;
  },

  // Transactions
  getTransactions: async (): Promise<InvestmentTransaction[]> => {
    const res = await api.get<ApiResponse<InvestmentTransaction[]>>('/investments/transactions');
    return res.data.data;
  },

  recordTransaction: async (payload: TransactionCreatePayload): Promise<InvestmentTransaction> => {
    const res = await api.post<ApiResponse<InvestmentTransaction>>('/investments/transactions', payload);
    return res.data.data;
  },

  // Watchlist
  getWatchlist: async (): Promise<WatchlistItem[]> => {
    const res = await api.get<ApiResponse<WatchlistItem[]>>('/investments/watchlist');
    return res.data.data;
  },

  addToWatchlist: async (payload: WatchlistCreatePayload): Promise<WatchlistItem> => {
    const res = await api.post<ApiResponse<WatchlistItem>>('/investments/watchlist', payload);
    return res.data.data;
  },

  removeFromWatchlist: async (itemId: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/investments/watchlist/${itemId}`);
    return res.data.data;
  },

  // IPO Custom Prompts
  getIPOPrompts: async (): Promise<IPOPrompt[]> => {
    const res = await api.get<ApiResponse<IPOPrompt[]>>('/investments/ipo/prompts');
    return res.data.data;
  },

  createIPOPrompt: async (payload: IPOPromptCreatePayload): Promise<IPOPrompt> => {
    const res = await api.post<ApiResponse<IPOPrompt>>('/investments/ipo/prompts', payload);
    return res.data.data;
  },

  updateIPOPrompt: async (promptId: string, payload: IPOPromptUpdatePayload): Promise<IPOPrompt> => {
    const res = await api.put<ApiResponse<IPOPrompt>>(`/investments/ipo/prompts/${promptId}`, payload);
    return res.data.data;
  },

  deleteIPOPrompt: async (promptId: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/investments/ipo/prompts/${promptId}`);
    return res.data.data;
  },

  // IPO Analysis
  analyzeIPO: async (payload: IPOAnalyzeRequest): Promise<IPOAnalyzeResult> => {
    const res = await api.post<ApiResponse<IPOAnalyzeResult>>('/investments/ipo/analyze', payload);
    return res.data.data;
  },
};
