import * as core from '@actions/core';
import { TerraformPlanParser } from './parser';
import { AnalysisResult, DetailedAnalysisResult } from './types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const terraformPlan = core.getInput('terraform-plan', { required: true });
    const ignoreResourcesInput = core.getInput('ignore-resources') || '[]';

    // Parse ignore resources
    let ignoreResources: string[] = [];
    try {
      ignoreResources = JSON.parse(ignoreResourcesInput);
      if (!Array.isArray(ignoreResources)) {
        throw new Error('ignore-resources must be a JSON array');
      }
    } catch (error) {
      core.setFailed(`Invalid ignore-resources format: ${error}`);
      return;
    }

    core.info(`Analyzing Terraform plan with ignore list: ${ignoreResources.join(', ')}`);

    // Parse the Terraform plan
    const parser = new TerraformPlanParser(ignoreResources);
    const { diffs, filteredOutput } = parser.parseFiltered(terraformPlan);
    const summary = parser.parsePlanSummary(terraformPlan);

    // Generate analysis result
    const result: AnalysisResult = {
      diff: diffs.length > 0,
      allDiffs: diffs,
      resources: [...new Set(diffs.map(d => d.address))], // Unique resource addresses
      rawDiffs: filteredOutput,
    };

    // Generate detailed JSON result
    const detailedResult: DetailedAnalysisResult = {
      hasDiffs: result.diff,
      summary,
      diffs: result.allDiffs,
      uniqueResources: result.resources,
      resourceCount: result.resources.length,
      rawOutput: terraformPlan,
      filteredOutput: result.rawDiffs,
      timestamp: new Date().toISOString()
    };

    core.info(`Found ${diffs.length} diffs affecting ${result.resources.length} resources`);

    // Set outputs
    core.setOutput('diff-bool', result.diff.toString());
    core.setOutput('diff-resources', JSON.stringify(result.resources));
    core.setOutput('diff-raw', result.rawDiffs);
    core.setOutput('diff-count', result.resources.length.toString());
    // Escape control characters for GitHub Actions compatibility
    const jsonOutput = JSON.stringify(detailedResult, null, 2)
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    core.setOutput('diff-json', jsonOutput);

    // Log summary
    if (result.diff) {
      core.info('Changes detected:');
      for (const diff of result.allDiffs) {
        core.info(`  ${diff.action}: ${diff.address} (${diff.resource})`);
      }
    } else {
      core.info('No changes detected');
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error}`);
  }
}

run();