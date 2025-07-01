export interface Company {
  id: string;
  name: string;
  ticker_symbol: string;
  industry: string;
  market: string;
  founded_year?: number;
  employee_count?: number;
  website?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialStatement {
  id: string;
  company_id: string;
  fiscal_year: number;
  fiscal_period: string;
  revenue: number;
  operating_income: number;
  net_income: number;
  total_assets: number;
  total_equity: number;
  total_debt: number;
  cash_and_equivalents: number;
  operating_cash_flow: number;
  capital_expenditure: number;
  filing_date: string;
  created_at: string;
  updated_at: string;
}

export interface RoicCalculation {
  id: string;
  company_id: string;
  fiscal_year: number;
  fiscal_period: string;
  nopat: number;
  invested_capital: number;
  roic: number;
  roic_percentage: number;
  calculation_method: 'standard' | 'adjusted' | 'conservative' | 'aggressive';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CompanySearchParams {
  name?: string;
  industry?: string;
  market?: string;
  page?: number;
  limit?: number;
}

export interface RoicAnalysisParams {
  companyId?: string;
  fiscalYear?: number;
  calculationMethod?: string;
  industryComparison?: boolean;
}