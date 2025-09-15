import { TerraformDiff, TerraformPlanSummary, ResourceDiff } from './types';

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
    const toAdd = diffs.filter(d => d.action === 'create').length;
    const toChange = diffs.filter(d => d.action === 'update').length;
    const toDestroy = diffs.filter(d => d.action === 'delete' || d.action === 'replace').length;

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
        action: diff.action,
        changes: {
          before: diff.action === 'create' ? null : 'Value will be known after apply',
          after: diff.action === 'delete' ? null : 'Value will be known after apply',
          description: this.getActionDescription(diff.action)
        }
      };

      resources.push(resourceDiff);
    }

    return resources;
  }

  private getActionDescription(action: string): string {
    switch (action) {
      case 'create':
        return 'Resource will be created';
      case 'update':
        return 'Resource will be updated in-place';
      case 'delete':
        return 'Resource will be destroyed';
      case 'replace':
        return 'Resource will be destroyed and recreated';
      default:
        return 'No changes';
    }
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
        const resourceType = this.extractResourceType(address);

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
      return this.createDiff('create', createMatch[1]);
    }

    // Format: "~ resource_type.resource_name will be updated in-place"
    const updateMatch = line.match(/^~\s+(.+?)\s+will be updated/);
    if (updateMatch) {
      return this.createDiff('update', updateMatch[1]);
    }

    // Format: "- resource_type.resource_name will be destroyed"
    const destroyMatch = line.match(/^-\s+(.+?)\s+will be destroyed/);
    if (destroyMatch) {
      return this.createDiff('delete', destroyMatch[1]);
    }

    // Format: "+/- resource_type.resource_name must be replaced"
    const replaceMatch = line.match(/^[+]?\/-\s+(.+?)\s+(must be replaced|will be replaced)/);
    if (replaceMatch) {
      return this.createDiff('replace', replaceMatch[1]);
    }

    return null;
  }

  private createDiff(action: TerraformDiff['action'], address: string): TerraformDiff {
    const resourceType = this.extractResourceType(address);
    return {
      action,
      resource: resourceType,
      address: address.trim(),
    };
  }

  private getActionFromSymbol(symbol: string): TerraformDiff['action'] | null {
    switch (symbol) {
      case '+': return 'create';
      case '~': return 'update';
      case '-': return 'delete';
      case '#': return 'create'; // Sometimes used for create
      default: return null;
    }
  }

  private extractResourceType(address: string): string {
    // Extract resource type from address like "aws_instance.example" -> "aws_instance"
    const match = address.match(/^([^.]+)/);
    return match ? match[1] : address;
  }

  private isValidResourceAddress(address: string): boolean {
    // Basic validation for Terraform resource addresses
    return /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*(\[.+\])?$/.test(address.trim());
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