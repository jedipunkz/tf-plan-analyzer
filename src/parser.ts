import { TerraformDiff } from './types';

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