import * as core from '@actions/core';
import { TerraformPlanParser } from './parser';
import { AnalysisResult, DetailedAnalysisResult } from './types';
import { TERRAFORM_ACTIONS } from './constants';
import { calculateActionMetrics, getUniqueResourceAddresses } from './utils';

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
    const detailedResources = parser.parseDetailedResources(terraformPlan);

    // Generate analysis result
    const resources = getUniqueResourceAddresses(diffs);
    const result: AnalysisResult = {
      diff: diffs.length > 0,
      allDiffs: diffs,
      resources,
      rawDiffs: filteredOutput,
    };

    // Generate detailed JSON result
    const detailedResult: DetailedAnalysisResult = {
      hasDiffs: result.diff,
      summary,
      resources: detailedResources,
      resourceCount: detailedResources.length,
      timestamp: new Date().toISOString()
    };

    // Calculate action-specific metrics
    const createMetrics = calculateActionMetrics(diffs, TERRAFORM_ACTIONS.CREATE);
    const destroyMetrics = calculateActionMetrics(diffs, TERRAFORM_ACTIONS.DELETE);
    const updateMetrics = calculateActionMetrics(diffs, TERRAFORM_ACTIONS.UPDATE);
    const replaceMetrics = calculateActionMetrics(diffs, TERRAFORM_ACTIONS.REPLACE);

    core.info(`Found ${diffs.length} diffs affecting ${result.resources.length} resources`);

    // Set outputs
    core.setOutput('diff-bool', result.diff.toString());
    core.setOutput('diff-resources', JSON.stringify(result.resources));
    core.setOutput('diff-raw', result.rawDiffs);
    core.setOutput('diff-count', result.resources.length.toString());

    // Set create outputs
    core.setOutput('create-bool', createMetrics.bool.toString());
    core.setOutput('create-count', createMetrics.count.toString());
    core.setOutput('create-resources', JSON.stringify(createMetrics.resources));

    // Set destroy outputs
    core.setOutput('destroy-bool', destroyMetrics.bool.toString());
    core.setOutput('destroy-count', destroyMetrics.count.toString());
    core.setOutput('destroy-resources', JSON.stringify(destroyMetrics.resources));

    // Set update outputs
    core.setOutput('update-bool', updateMetrics.bool.toString());
    core.setOutput('update-count', updateMetrics.count.toString());
    core.setOutput('update-resources', JSON.stringify(updateMetrics.resources));

    // Set replace outputs
    core.setOutput('replace-bool', replaceMetrics.bool.toString());
    core.setOutput('replace-count', replaceMetrics.count.toString());
    core.setOutput('replace-resources', JSON.stringify(replaceMetrics.resources));

    // Create compact JSON output without pretty printing to avoid GitHub Actions issues
    const jsonOutput = JSON.stringify(detailedResult);

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