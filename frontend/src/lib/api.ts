import axios from 'axios';
import { 
  Company, 
  FinancialStatement, 
  RoicCalculation, 
  ApiResponse, 
  PaginatedResponse,
  CompanySearchParams,
  RoicAnalysisParams 
} from '@/types';
import { IndustryAnalysis, RankingItem, HealthCheckResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Companies API
export const companiesApi = {
  // Get all companies with optional search parameters
  getCompanies: async (params?: CompanySearchParams): Promise<PaginatedResponse<Company>> => {
    const response = await api.get('/companies', { params });
    return response.data;
  },

  // Get single company by ID
  getCompany: async (id: string): Promise<ApiResponse<Company>> => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  // Search companies by name
  searchCompanies: async (query: string): Promise<ApiResponse<Company[]>> => {
    const response = await api.get(`/companies/search`, { params: { q: query } });
    return response.data;
  },

  // Get companies by industry
  getCompaniesByIndustry: async (industry: string): Promise<ApiResponse<Company[]>> => {
    const response = await api.get(`/companies/industry/${industry}`);
    return response.data;
  },
};

// Financial Statements API
export const financialStatementsApi = {
  // Get financial statements for a company
  getByCompany: async (companyId: string, fiscalYear?: number): Promise<ApiResponse<FinancialStatement[]>> => {
    const params = fiscalYear ? { fiscal_year: fiscalYear } : {};
    const response = await api.get(`/financial-statements/company/${companyId}`, { params });
    return response.data;
  },

  // Get latest financial statement for a company
  getLatest: async (companyId: string): Promise<ApiResponse<FinancialStatement>> => {
    const response = await api.get(`/financial-statements/company/${companyId}/latest`);
    return response.data;
  },
};

// ROIC Calculations API
export const roicApi = {
  // Calculate ROIC for a company
  calculate: async (companyId: string, params?: RoicAnalysisParams): Promise<ApiResponse<RoicCalculation>> => {
    const response = await api.post(`/roic/calculate/${companyId}`, params);
    return response.data;
  },

  // Get ROIC calculations for a company
  getByCompany: async (companyId: string, fiscalYear?: number): Promise<ApiResponse<RoicCalculation[]>> => {
    const params = fiscalYear ? { fiscal_year: fiscalYear } : {};
    const response = await api.get(`/roic/company/${companyId}`, { params });
    return response.data;
  },

  // Get ROIC comparison data
  getComparison: async (companyIds: string[], fiscalYear?: number): Promise<ApiResponse<RoicCalculation[]>> => {
    const params = {
      company_ids: companyIds.join(','),
      ...(fiscalYear && { fiscal_year: fiscalYear }),
    };
    const response = await api.get('/roic/comparison', { params });
    return response.data;
  },

  // Get industry ROIC analysis
  getIndustryAnalysis: async (industry: string, fiscalYear?: number): Promise<ApiResponse<IndustryAnalysis>> => {
    const params = fiscalYear ? { fiscal_year: fiscalYear } : {};
    const response = await api.get(`/roic/industry/${industry}`, { params });
    return response.data;
  },

  // Get ROIC rankings
  getRankings: async (industry?: string, limit?: number): Promise<ApiResponse<RankingItem[]>> => {
    const params = {
      ...(industry && { industry }),
      ...(limit && { limit }),
    };
    const response = await api.get('/roic/rankings', { params });
    return response.data;
  },
};

// Health Check API
export const healthApi = {
  check: async (): Promise<ApiResponse<HealthCheckResponse>> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;