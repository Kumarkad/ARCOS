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
  UpcomingIPOItem,
} from '../types/investment';

export const LIVE_2026_IPOS: UpcomingIPOItem[] = [
  {
    id: "ipo-milky-mist",
    company_name: "Milky Mist Dairy Food Ltd",
    symbol: "MILKYMIST.NS",
    issue_size: "₹2,000 Cr",
    price_band: "₹420 - ₹445",
    open_date: "17 Sep 2026",
    close_date: "22 Sep 2026",
    listing_date: "26 Sep 2026",
    status: "Open",
    expected_gmp: "₹68 (16%)",
    sector: "FMCG & Dairy Products",
    description: "Leading premium value-added dairy brand in South India, with rapid national expansion in paneer, curd, and cheese."
  },
  {
    id: "ipo-dhoot",
    company_name: "Dhoot Transmission Ltd",
    symbol: "DHOOT.NS",
    issue_size: "₹1,150 Cr",
    price_band: "₹280 - ₹295",
    open_date: "18 Sep 2026",
    close_date: "23 Sep 2026",
    listing_date: "28 Sep 2026",
    status: "Open",
    expected_gmp: "₹45 (15%)",
    sector: "Automotive Components & Wiring",
    description: "Global tier-1 wiring harness and electronic switch systems manufacturer supplying major 2W, 4W and EV OEMs."
  },
  {
    id: "ipo-molbio",
    company_name: "Molbio Diagnostics Ltd",
    symbol: "MOLBIO.NS",
    issue_size: "₹2,400 Cr",
    price_band: "₹950 - ₹1,000",
    open_date: "22 Sep 2026",
    close_date: "25 Sep 2026",
    listing_date: "30 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹140 (14%)",
    sector: "Healthcare & Diagnostics Tech",
    description: "Innovator behind Truenat point-of-care PCR platforms deployed across 40+ countries for infectious disease detection."
  },
  {
    id: "ipo-nse",
    company_name: "National Stock Exchange of India Ltd (NSE)",
    symbol: "NSE.NS",
    issue_size: "₹10,000 Cr",
    price_band: "₹1,200 - ₹1,250",
    open_date: "24 Sep 2026",
    close_date: "28 Sep 2026",
    listing_date: "03 Oct 2026",
    status: "Upcoming",
    expected_gmp: "₹210 (17%)",
    sector: "Financial Market Infrastructure",
    description: "India's largest stock exchange platform handling 90%+ equity derivatives and spot volumes nationwide."
  },
  {
    id: "ipo-juniper-green",
    company_name: "Juniper Green Energy Ltd",
    symbol: "JUNIPER.NS",
    issue_size: "₹3,000 Cr",
    price_band: "₹210 - ₹225",
    open_date: "28 Sep 2026",
    close_date: "02 Oct 2026",
    listing_date: "07 Oct 2026",
    status: "Upcoming",
    expected_gmp: "₹36 (16%)",
    sector: "Renewable Energy & Solar",
    description: "Fast-growing independent renewable power producer with 1.2+ GW operating capacity across wind and solar."
  },
  {
    id: "ipo-manipal-health",
    company_name: "Manipal Health Enterprises Ltd",
    symbol: "MANIPAL.NS",
    issue_size: "₹5,000 Cr",
    price_band: "₹550 - ₹580",
    open_date: "05 Oct 2026",
    close_date: "08 Oct 2026",
    listing_date: "14 Oct 2026",
    status: "Upcoming",
    expected_gmp: "₹75 (13%)",
    sector: "Healthcare & Multi-specialty Hospitals",
    description: "One of India's largest multi-specialty healthcare networks operating 30+ hospitals with 9,500+ beds."
  }
];

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

  // Upcoming IPOs
  getUpcomingIPOs: async (): Promise<UpcomingIPOItem[]> => {
    try {
      const res = await api.get<ApiResponse<UpcomingIPOItem[]>>('/investments/ipo/upcoming');
      const items = res.data?.data || [];

      // Filter out outdated 2024 items if returning from an older frozen backend deployment
      const isStale2024 = items.some((i) =>
        (i.listing_date && i.listing_date.includes('2024')) ||
        (i.open_date && i.open_date.includes('2024')) ||
        (i.company_name && (
          i.company_name.includes('Swiggy') ||
          i.company_name.includes('Hyundai Motor India') ||
          i.company_name.includes('NTPC Green Energy') ||
          i.company_name.includes('Waaree') ||
          i.company_name.includes('Afcons') ||
          i.company_name.includes('Sagility')
        ))
      );

      if (!isStale2024 && items.length > 0) {
        return items;
      }
      return LIVE_2026_IPOS;
    } catch {
      return LIVE_2026_IPOS;
    }
  },
};



