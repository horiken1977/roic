// Additional API types
export interface IndustryAnalysis {
  industry: string;
  averageRoic: number;
  medianRoic: number;
  topPerformers: Array<{
    companyCode: string;
    companyName: string;
    roic: number;
  }>;
  fiscalYear: number;
  totalCompanies: number;
}

export interface RankingItem {
  rank: number;
  companyCode: string;
  companyName: string;
  industry: string;
  roic: number;
  change: number;
  fiscalYear: number;
}

export interface FinancialDataInput {
  fiscalYear: number;
  revenue: number;
  operatingIncome: number;
  taxRate: number;
  assets: number;
  liabilities: number;
  equity: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  database: 'connected' | 'disconnected';
  services: {
    [key: string]: boolean;
  };
}