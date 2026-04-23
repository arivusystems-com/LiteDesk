export interface SalesExecutiveMetric {
  value: number;
  deltaPct: number;
  trend: number[];
}

export interface SalesPipelineStage {
  stageId: string;
  label: string;
  count: number;
  value: number;
  conversionToNextPct: number | null;
}

export interface SalesDropoff {
  from: string | null;
  to: string | null;
  dropPct: number;
}

export interface SalesStuckStage {
  stageId: string;
  count: number;
  thresholdDays?: number;
}

export interface SalesForecastByRep {
  repId: string;
  name: string;
  commit: number;
  bestCase: number;
}

export interface SalesForecastByMonth {
  month: string;
  commit: number;
  bestCase: number;
  pipelineUncommitted: number;
}

export interface SalesForecastAccuracyRow {
  month: string;
  forecast?: number;
  actual?: number;
  accuracyPct: number;
}

export interface SalesRepPerformanceRow {
  repId: string;
  name: string;
  rank: number;
  quotaAttainmentPct: number;
  quotaBand: 'green' | 'yellow' | 'red' | string;
  revenueClosed: number;
  pipelineOwned: number;
  winRatePct: number;
  activityCount: number;
  pipelineCreatedThisWeek?: number;
}

export interface SalesActivityRow {
  week: string;
  calls: number;
  meetings: number;
  tasks: number;
}

export interface SalesPipelineWeekRow {
  week: string;
  value: number;
  dealCount?: number;
}

export interface SalesEfficiencyFlag {
  repId: string;
  name: string;
  reason: string;
  activityCount: number;
  conversionPct: number;
}

export interface SalesAlert {
  code: string;
  message: string;
  action: string;
  severity: 'high' | 'medium' | 'low' | string;
  priority?: 'high' | 'medium' | 'low' | string;
}

export interface SalesAiSummary {
  hitTargetLikelihoodPct: number;
  summary: string;
  recommendedActions: string[];
}

export interface SalesDashboardMetricsResponse {
  generatedAt: string;
  pipelines: string[];
  kpis: {
    openDeals: number;
    totalDeals: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    closingSoon: number;
  };
  executiveSnapshot: {
    totalRevenue: SalesExecutiveMetric;
    pipelineValue: SalesExecutiveMetric;
    forecast: SalesExecutiveMetric;
    winRate: SalesExecutiveMetric;
    avgSalesCycle: SalesExecutiveMetric;
    pipelineCoverage: SalesExecutiveMetric;
  };
  pipelineHealth: {
    stages: SalesPipelineStage[];
    biggestDropoff: SalesDropoff;
    stuckDeals: SalesStuckStage[];
  };
  forecasting: {
    commit: number;
    bestCase: number;
    pipelineUncommitted: number;
    byRep: SalesForecastByRep[];
    byClosingMonth: SalesForecastByMonth[];
    accuracyLast3Months: SalesForecastAccuracyRow[];
    vsTarget: {
      target: number;
      forecastTotal: number;
      attainmentPct: number;
    };
  };
  repPerformance: SalesRepPerformanceRow[];
  activityPipeline: {
    activityOverTime: SalesActivityRow[];
    newPipelinePerWeek: SalesPipelineWeekRow[];
    activityToDealConversionPct: number;
    efficiencyFlags: SalesEfficiencyFlag[];
  };
  trend: {
    values: number[];
    rawValues?: number[];
  };
  alerts: SalesAlert[];
  aiSummary: SalesAiSummary;
  moduleCounts: Record<string, number>;
  windows?: {
    staleDays?: number;
    closeSoonDays?: number;
    responseLookbackDays?: number;
    importLookbackDays?: number;
  };
  health?: {
    score?: number;
    status?: string;
    signalCount?: number;
  };
}
