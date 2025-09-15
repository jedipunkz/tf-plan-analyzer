export interface TerraformDiff {
  action: 'create' | 'update' | 'delete' | 'replace' | 'no-op';
  resource: string;
  address: string;
  changes?: {
    before?: any;
    after?: any;
    description?: string;
  };
}

export interface ResourceDiff {
  address: string;
  resourceType: string;
  action: 'create' | 'update' | 'delete' | 'replace';
  changes: {
    before: any;
    after: any;
    description: string;
  };
}

export interface AnalysisResult {
  diff: boolean;
  allDiffs: TerraformDiff[];
  resources: string[];
  rawDiffs: string;
}

export interface TerraformPlanSummary {
  totalChanges: number;
  toAdd: number;
  toChange: number;
  toDestroy: number;
}

export interface DetailedAnalysisResult {
  hasDiffs: boolean;
  summary: TerraformPlanSummary;
  resources: ResourceDiff[];
  resourceCount: number;
  timestamp: string;
}