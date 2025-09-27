import { TerraformDiff } from './types';
import { TerraformAction } from './constants';

export function filterDiffsByAction(diffs: TerraformDiff[], action: TerraformAction): TerraformDiff[] {
  return diffs.filter(d => d.action === action);
}

export function getUniqueResourceAddresses(diffs: TerraformDiff[]): string[] {
  return [...new Set(diffs.map(d => d.address))];
}

export function extractResourceType(address: string): string {
  const match = address.match(/^([^.]+)/);
  return match ? match[1] : address;
}

export function isValidResourceAddress(address: string): boolean {
  return /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*(\[.+\])?$/.test(address.trim());
}

export interface ActionMetrics {
  bool: boolean;
  count: number;
  resources: string[];
}

export function calculateActionMetrics(diffs: TerraformDiff[], action: TerraformAction): ActionMetrics {
  const actionDiffs = filterDiffsByAction(diffs, action);
  const resources = getUniqueResourceAddresses(actionDiffs);

  return {
    bool: resources.length > 0,
    count: resources.length,
    resources
  };
}