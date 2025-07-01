import { create } from 'zustand';
import { Company, RoicCalculation, FinancialStatement } from '@/types';

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  searchQuery: string;
  selectedIndustry: string;
  selectedMarket: string;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCompanies: (companies: Company[]) => void;
  setSelectedCompany: (company: Company | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndustry: (industry: string) => void;
  setSelectedMarket: (market: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
}

interface RoicState {
  roicData: RoicCalculation[];
  selectedRoic: RoicCalculation | null;
  comparisonData: RoicCalculation[];
  industryAnalysis: any | null;
  rankings: any[];
  calculationMethod: 'standard' | 'adjusted' | 'conservative' | 'aggressive';
  selectedFiscalYear: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  setRoicData: (data: RoicCalculation[]) => void;
  setSelectedRoic: (roic: RoicCalculation | null) => void;
  setComparisonData: (data: RoicCalculation[]) => void;
  setIndustryAnalysis: (analysis: any) => void;
  setRankings: (rankings: any[]) => void;
  setCalculationMethod: (method: 'standard' | 'adjusted' | 'conservative' | 'aggressive') => void;
  setSelectedFiscalYear: (year: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface FinancialState {
  financialStatements: FinancialStatement[];
  selectedStatement: FinancialStatement | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setFinancialStatements: (statements: FinancialStatement[]) => void;
  setSelectedStatement: (statement: FinancialStatement | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: 'ja' | 'en';
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'ja' | 'en') => void;
}

// Company Store
export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  selectedCompany: null,
  searchQuery: '',
  selectedIndustry: '',
  selectedMarket: '',
  loading: false,
  error: null,
  
  setCompanies: (companies) => set({ companies }),
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedIndustry: (industry) => set({ selectedIndustry: industry }),
  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ 
    searchQuery: '', 
    selectedIndustry: '', 
    selectedMarket: '',
    companies: [] 
  }),
}));

// ROIC Store
export const useRoicStore = create<RoicState>((set) => ({
  roicData: [],
  selectedRoic: null,
  comparisonData: [],
  industryAnalysis: null,
  rankings: [],
  calculationMethod: 'standard',
  selectedFiscalYear: new Date().getFullYear() - 1, // Default to last year
  loading: false,
  error: null,
  
  setRoicData: (data) => set({ roicData: data }),
  setSelectedRoic: (roic) => set({ selectedRoic: roic }),
  setComparisonData: (data) => set({ comparisonData: data }),
  setIndustryAnalysis: (analysis) => set({ industryAnalysis: analysis }),
  setRankings: (rankings) => set({ rankings }),
  setCalculationMethod: (method) => set({ calculationMethod: method }),
  setSelectedFiscalYear: (year) => set({ selectedFiscalYear: year }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// Financial Store
export const useFinancialStore = create<FinancialState>((set) => ({
  financialStatements: [],
  selectedStatement: null,
  loading: false,
  error: null,
  
  setFinancialStatements: (statements) => set({ financialStatements: statements }),
  setSelectedStatement: (statement) => set({ selectedStatement: statement }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// UI Store
export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  language: 'ja',
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}));

// Combined store hook for convenience
export const useAppStore = () => ({
  company: useCompanyStore(),
  roic: useRoicStore(),
  financial: useFinancialStore(),
  ui: useUIStore(),
});