import { TerraformDiff, TerraformPlanSummary, ResourceDiff } from './types';
import { TERRAFORM_ACTIONS, ACTION_DESCRIPTIONS } from './constants';
import { extractResourceType } from './utils';

export class TerraformPlanParser {
  private ignoreResources: string[];

  constructor(ignoreResources: string[] = []) {
    this.ignoreResources = ignoreResources;
  }

  parse(planOutput: string): TerraformDiff[] {
    const diffs: TerraformDiff[] = [];
    const lines = planOutput.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and non-resource lines
      if (!line || !this.isResourceLine(line)) {
        continue;
      }

      const diff = this.parseLine(line, lines, i);
      if (diff && !this.shouldIgnoreResource(diff.resource, diff.address)) {
        diffs.push(diff);
      }
    }

    return diffs;
  }

  parseFiltered(planOutput: string): { diffs: TerraformDiff[], filteredOutput: string } {
    const diffs = this.parse(planOutput);
    const filteredOutput = this.filterPlanOutput(planOutput);
    return { diffs, filteredOutput };
  }

  parsePlanSummary(planOutput: string): TerraformPlanSummary {
    // Always calculate from diffs to ensure ignore-resources is applied
    const diffs = this.parse(planOutput);
    const toAdd = diffs.filter(d => d.action === TERRAFORM_ACTIONS.CREATE).length;
    const toChange = diffs.filter(d => d.action === TERRAFORM_ACTIONS.UPDATE).length;
    const toDestroy = diffs.filter(d =>
      d.action === TERRAFORM_ACTIONS.DELETE || d.action === TERRAFORM_ACTIONS.REPLACE
    ).length;

    return {
      totalChanges: toAdd + toChange + toDestroy,
      toAdd,
      toChange,
      toDestroy
    };
  }

  parseDetailedResources(planOutput: string): ResourceDiff[] {
    const diffs = this.parse(planOutput);
    const resources: ResourceDiff[] = [];

    for (const diff of diffs) {
      const resourceDiff: ResourceDiff = {
        address: diff.address,
        resourceType: diff.resource,
        action: diff.action as Exclude<typeof diff.action, 'no-op'>,
        changes: {
          before: diff.action === TERRAFORM_ACTIONS.CREATE ? null : 'Value will be known after apply',
          after: diff.action === TERRAFORM_ACTIONS.DELETE ? null : 'Value will be known after apply',
          description: ACTION_DESCRIPTIONS[diff.action]
        }
      };

      resources.push(resourceDiff);
    }

    return resources;
  }


  private filterPlanOutput(planOutput: string): string {
    const lines = planOutput.split('\n');
    const filteredLines: string[] = [];
    let skipResource = false;
    let currentResourceAddress = '';
    let ignoredCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if this is a resource declaration line
      const resourceMatch = trimmedLine.match(/^#\s+(.+?)\s+will be (created|updated|destroyed|replaced)/);
      if (resourceMatch) {
        const address = resourceMatch[1];
        const resourceType = extractResourceType(address);

        if (this.shouldIgnoreResource(resourceType, address)) {
          skipResource = true;
          currentResourceAddress = address;
          ignoredCount++;
          continue; // Skip this line
        } else {
          skipResource = false;
          currentResourceAddress = '';
        }
      }

      // Skip lines that are part of an ignored resource block
      if (skipResource) {
        // Check if we've reached the end of the resource block
        if (trimmedLine === '' || (trimmedLine.startsWith('#') && !trimmedLine.includes(currentResourceAddress))) {
          skipResource = false;
          currentResourceAddress = '';
        } else {
          continue; // Skip this line
        }
      }

      // Update Plan statistics
      const planMatch = trimmedLine.match(/^Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy\./);
      if (planMatch) {
        const [, add, change, destroy] = planMatch;
        const newAdd = Math.max(0, parseInt(add) - ignoredCount);
        const adjustedLine = line.replace(
          /Plan:\s+\d+\s+to\s+add,\s+\d+\s+to\s+change,\s+\d+\s+to\s+destroy\./,
          `Plan: ${newAdd} to add, ${change} to change, ${destroy} to destroy.`
        );
        filteredLines.push(adjustedLine);
        continue;
      }

      filteredLines.push(line);
    }

    return filteredLines.join('\n');
  }

  private isResourceLine(line: string): boolean {
    // Only match resource declaration lines with action descriptions
    return line.includes('will be created') ||
           line.includes('will be updated') ||
           line.includes('will be destroyed') ||
           line.includes('must be replaced');
  }

  private parseLine(line: string, lines: string[], index: number): TerraformDiff | null {
    // Parse different Terraform plan formats

    // Format: "# resource_type.resource_name will be created"
    const createMatch = line.match(/^#\s+(.+?)\s+will be created/);
    if (createMatch) {
      return this.createDiff(TERRAFORM_ACTIONS.CREATE, createMatch[1]);
    }

    // Format: "~ resource_type.resource_name will be updated in-place"
    const updateMatch = line.match(/^~\s+(.+?)\s+will be updated/);
    if (updateMatch) {
      return this.createDiff(TERRAFORM_ACTIONS.UPDATE, updateMatch[1]);
    }

    // Format: "- resource_type.resource_name will be destroyed"
    const destroyMatch = line.match(/^-\s+(.+?)\s+will be destroyed/);
    if (destroyMatch) {
      return this.createDiff(TERRAFORM_ACTIONS.DELETE, destroyMatch[1]);
    }

    // Format: "+/- resource_type.resource_name must be replaced"
    const replaceMatch = line.match(/^[+]?\/-\s+(.+?)\s+(must be replaced|will be replaced)/);
    if (replaceMatch) {
      return this.createDiff(TERRAFORM_ACTIONS.REPLACE, replaceMatch[1]);
    }

    return null;
  }

  private createDiff(action: TerraformDiff['action'], address: string): TerraformDiff {
    const resourceType = extractResourceType(address);
    return {
      action,
      resource: resourceType,
      address: address.trim(),
    };
  }


  private shouldIgnoreResource(resourceType: string, resourceAddress: string): boolean {
    // Check if we should ignore by resource type (e.g., "null_resource")
    if (this.ignoreResources.includes(resourceType)) {
      return true;
    }

    // Check if we should ignore by specific resource address (e.g., "null_resource.main")
    if (this.ignoreResources.includes(resourceAddress)) {
      return true;
    }

    return false;
  }
}