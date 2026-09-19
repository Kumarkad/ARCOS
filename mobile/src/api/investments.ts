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
    id: "ipo-nse",
    company_name: "National Stock Exchange of India",
    symbol: "NSE.NS",
    issue_size: "₹10,000 Cr",
    fresh_issue: "Nil (Pure OFS)",
    offer_for_sale: "₹10,000 Cr (100%)",
    price_band: "₹1,200 - ₹1,250",
    open_date: "17 Sep 2026",
    close_date: "21 Sep 2026",
    allotment_date: "22 Sep 2026",
    listing_date: "24 Sep 2026",
    status: "Open",
    expected_gmp: "₹185 (15%)",
    gmp_pct: 15.0,
    lot_size: 12,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE",
    sector: "Financial Market Infrastructure",
    description: "India's premier stock exchange platform handling the vast majority of cash equity and equity derivatives turnover."
  },
  {
    id: "ipo-sonaselection",
    company_name: "Sonaselection India",
    symbol: "SONASEL.NS",
    issue_size: "₹450 Cr",
    fresh_issue: "₹350 Cr (78%)",
    offer_for_sale: "₹100 Cr (22%)",
    price_band: "₹145 - ₹152",
    open_date: "17 Sep 2026",
    close_date: "21 Sep 2026",
    allotment_date: "22 Sep 2026",
    listing_date: "25 Sep 2026",
    status: "Open",
    expected_gmp: "₹32 (21%)",
    gmp_pct: 21.0,
    lot_size: 95,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Consumer Retail & Apparel",
    description: "Fast-growing lifestyle and fast-fashion retail chain with expansive national presence across Tier-1 and Tier-2 hubs."
  },
  {
    id: "ipo-varmora-granito",
    company_name: "Varmora Granito",
    symbol: "VARMORA.NS",
    issue_size: "₹1,200 Cr",
    fresh_issue: "₹800 Cr (67%)",
    offer_for_sale: "₹400 Cr (33%)",
    price_band: "₹240 - ₹255",
    open_date: "22 Sep 2026",
    close_date: "24 Sep 2026",
    allotment_date: "25 Sep 2026",
    listing_date: "29 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹40 (16%)",
    gmp_pct: 16.0,
    lot_size: 58,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Ceramics & Building Materials",
    description: "Prominent Indian tile, vitrified slab, and bathware manufacturer with extensive nationwide and export distribution."
  },
  {
    id: "ipo-adroit-industries",
    company_name: "Adroit Industries (India)",
    symbol: "ADROIT.NS",
    issue_size: "₹520 Cr",
    fresh_issue: "₹380 Cr (73%)",
    offer_for_sale: "₹140 Cr (27%)",
    price_band: "₹215 - ₹228",
    open_date: "23 Sep 2026",
    close_date: "25 Sep 2026",
    allotment_date: "28 Sep 2026",
    listing_date: "30 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹35 (16%)",
    gmp_pct: 16.0,
    lot_size: 60,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Automotive & Engineering Components",
    description: "Precision engineered driveline components, steering joints, and propshaft assemblies for commercial vehicle OEMs."
  },
  {
    id: "ipo-elevate-campuses",
    company_name: "Elevate Campuses",
    symbol: "ELEVATE.NS",
    issue_size: "₹620 Cr",
    fresh_issue: "₹500 Cr (81%)",
    offer_for_sale: "₹120 Cr (19%)",
    price_band: "₹180 - ₹190",
    open_date: "23 Sep 2026",
    close_date: "25 Sep 2026",
    allotment_date: "28 Sep 2026",
    listing_date: "30 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹28 (15%)",
    gmp_pct: 15.0,
    lot_size: 75,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Education & Student Housing",
    description: "Institutional owner and operator of purpose-built student housing communities and collegiate amenities."
  },
  {
    id: "ipo-swastika-infra",
    company_name: "Swastika Infra",
    symbol: "SWASTIK.NS",
    issue_size: "₹480 Cr",
    fresh_issue: "₹480 Cr (100%)",
    offer_for_sale: "Nil (0%)",
    price_band: "₹115 - ₹122",
    open_date: "23 Sep 2026",
    close_date: "25 Sep 2026",
    allotment_date: "28 Sep 2026",
    listing_date: "30 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹18 (15%)",
    gmp_pct: 15.0,
    lot_size: 120,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Engineering & Infrastructure",
    description: "EPC infrastructure contractor focused on national highway corridors, flyovers, and heavy civil construction."
  },
  {
    id: "ipo-armee-infotech",
    company_name: "ArMee Infotech",
    symbol: "ARMEE.NS",
    issue_size: "₹390 Cr",
    fresh_issue: "₹270 Cr (69%)",
    offer_for_sale: "₹120 Cr (31%)",
    price_band: "₹165 - ₹175",
    open_date: "23 Sep 2026",
    close_date: "25 Sep 2026",
    allotment_date: "28 Sep 2026",
    listing_date: "30 Sep 2026",
    status: "Upcoming",
    expected_gmp: "₹25 (15%)",
    gmp_pct: 15.0,
    lot_size: 80,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "IT Infrastructure & Solutions",
    description: "Enterprise system integration, smart-city surveillance, and high-performance government IT solutions."
  },
  {
    id: "ipo-a-one-steels",
    company_name: "A-One Steels India",
    symbol: "AONESTEEL.NS",
    issue_size: "₹850 Cr",
    fresh_issue: "₹650 Cr (76%)",
    offer_for_sale: "₹200 Cr (24%)",
    price_band: "₹310 - ₹325",
    open_date: "24 Sep 2026",
    close_date: "28 Sep 2026",
    allotment_date: "29 Sep 2026",
    listing_date: "01 Oct 2026",
    status: "Upcoming",
    expected_gmp: "₹55 (17%)",
    gmp_pct: 17.0,
    lot_size: 46,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Metals & Structural Steel",
    description: "Integrated manufacturer of structural steel products, MS billets, and premium TMT rebars."
  },
  {
    id: "ipo-ss-retail",
    company_name: "SS Retail",
    symbol: "SSRETAIL.NS",
    issue_size: "₹320 Cr",
    fresh_issue: "₹220 Cr (69%)",
    offer_for_sale: "₹100 Cr (31%)",
    price_band: "₹190 - ₹205",
    open_date: "16 Sep 2026",
    close_date: "18 Sep 2026",
    allotment_date: "21 Sep 2026",
    listing_date: "23 Sep 2026",
    status: "Listing Soon",
    expected_gmp: "₹30 (15%)",
    gmp_pct: 15.0,
    lot_size: 65,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Retail & Consumer Goods",
    description: "Multi-brand retail chain specializing in personal accessories, footwear, and consumer apparel."
  },
  {
    id: "ipo-jindal-supreme",
    company_name: "Jindal Supreme (India)",
    symbol: "JINDALSUP.NS",
    issue_size: "₹750 Cr",
    fresh_issue: "₹550 Cr (73%)",
    offer_for_sale: "₹200 Cr (27%)",
    price_band: "₹340 - ₹360",
    open_date: "16 Sep 2026",
    close_date: "18 Sep 2026",
    allotment_date: "21 Sep 2026",
    listing_date: "23 Sep 2026",
    status: "Listing Soon",
    expected_gmp: "₹50 (14%)",
    gmp_pct: 14.0,
    lot_size: 40,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Steel & Tubes Manufacturing",
    description: "Precision ERW pipes, structural tubes, and galvanized hollow sections for industrial applications."
  },
  {
    id: "ipo-hero-motors",
    company_name: "Hero Motors",
    symbol: "HEROMOT.NS",
    issue_size: "₹1,500 Cr",
    fresh_issue: "₹900 Cr (60%)",
    offer_for_sale: "₹600 Cr (40%)",
    price_band: "₹480 - ₹510",
    open_date: "16 Sep 2026",
    close_date: "18 Sep 2026",
    allotment_date: "21 Sep 2026",
    listing_date: "23 Sep 2026",
    status: "Listing Soon",
    expected_gmp: "₹72 (15%)",
    gmp_pct: 15.0,
    lot_size: 30,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Automotive Transmissions & Powertrains",
    description: "Global tier-1 powertrain and transmission systems supplier for premium e-bikes, 2W, and passenger EVs."
  },
  {
    id: "ipo-manika-plastech",
    company_name: "Manika Plastech",
    symbol: "MANIKA.NS",
    issue_size: "₹280 Cr",
    fresh_issue: "₹200 Cr (71%)",
    offer_for_sale: "₹80 Cr (29%)",
    price_band: "₹130 - ₹140",
    open_date: "11 Sep 2026",
    close_date: "16 Sep 2026",
    allotment_date: "17 Sep 2026",
    listing_date: "21 Sep 2026",
    status: "Listing Soon",
    expected_gmp: "₹22 (16%)",
    gmp_pct: 16.0,
    lot_size: 90,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Packaging & Polymer Engineering",
    description: "Rigid plastic packaging and industrial polymer solutions for FMCG, lubricants, and chemicals."
  },
  {
    id: "ipo-veegaland-dev",
    company_name: "Veegaland Developers",
    symbol: "VEEGA.NS",
    issue_size: "₹400 Cr",
    fresh_issue: "₹400 Cr (100%)",
    offer_for_sale: "Nil (0%)",
    price_band: "₹260 - ₹275",
    open_date: "10 Sep 2026",
    close_date: "15 Sep 2026",
    allotment_date: "16 Sep 2026",
    listing_date: "18 Sep 2026",
    status: "Closed",
    expected_gmp: "₹38 (14%)",
    gmp_pct: 14.0,
    lot_size: 50,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Real Estate Development",
    description: "Eco-friendly premium residential builder with landmark residential and commercial projects."
  },
  {
    id: "ipo-rentomojo",
    company_name: "Rentomojo",
    symbol: "RENTOMOJ.NS",
    issue_size: "₹650 Cr",
    fresh_issue: "₹450 Cr (69%)",
    offer_for_sale: "₹200 Cr (31%)",
    price_band: "₹300 - ₹320",
    open_date: "09 Sep 2026",
    close_date: "11 Sep 2026",
    allotment_date: "12 Sep 2026",
    listing_date: "16 Sep 2026",
    status: "Closed",
    expected_gmp: "₹45 (14%)",
    gmp_pct: 14.0,
    lot_size: 45,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Consumer Tech & Rental Services",
    description: "India's leading consumer tech rental platform providing appliances, furniture, and electronics on subscription."
  },
  {
    id: "ipo-asset-reconstruction",
    company_name: "Asset Reconstruction Co.(India)",
    symbol: "ARCIL.NS",
    issue_size: "₹1,800 Cr",
    fresh_issue: "Nil (Pure OFS)",
    offer_for_sale: "₹1,800 Cr (100%)",
    price_band: "₹410 - ₹435",
    open_date: "09 Sep 2026",
    close_date: "11 Sep 2026",
    allotment_date: "12 Sep 2026",
    listing_date: "16 Sep 2026",
    status: "Closed",
    expected_gmp: "₹60 (14%)",
    gmp_pct: 14.0,
    lot_size: 35,
    retail_quota: "35%",
    qib_quota: "50%",
    nii_quota: "15%",
    listing_exchange: "BSE, NSE",
    sector: "Asset Reconstruction & Bad Loan Resolution",
    description: "Pioneering Indian asset reconstruction company partnering with major lenders to resolve stressed debt portfolios."
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



