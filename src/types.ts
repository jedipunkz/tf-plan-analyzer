import { TerraformAction } from './constants';

export interface TerraformDiff {
  action: TerraformAction;
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
  action: Exclude<TerraformAction, 'no-op'>;
  changes: {
    before: any;
    after: any;
    description: string;
  };
}

export interface ParseResult {
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

export interface DetailedParseResult {
  hasDiffs: boolean;
  summary: TerraformPlanSummary;
  resources: ResourceDiff[];
  resourceCount: number;
  timestamp: string;
}