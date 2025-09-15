export interface TerraformDiff {
  action: 'create' | 'update' | 'delete' | 'replace' | 'no-op';
  resource: string;
  address: string;
  changes?: {
    before?: any;
    after?: any;
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
  diffs: TerraformDiff[];
  uniqueResources: string[];
  resourceCount: number;
  rawOutput: string;
  filteredOutput: string;
  timestamp: string;
}