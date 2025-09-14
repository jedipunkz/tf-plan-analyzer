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