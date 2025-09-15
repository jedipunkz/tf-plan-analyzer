# Terraform Plan Parser

A GitHub Action to parse Terraform plan diffs and provide structured output for CI/CD workflows.

## Features

- 📊 Parse Terraform plan output and extract changes
- 🚫 Ignore specific resource types or individual resources via configuration
- 📝 Output structured data for further processing
- 🔄 Support for all Terraform operations (create, update, delete, replace)
- 🧹 Filter ignored resources from raw output for clean display

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `terraform-plan` | Terraform plan output to parse | Yes | - |
| `ignore-resources` | JSON array of resource types or specific resources to ignore | No | `[]` |

### Ignore Resources Examples

```yaml
# Ignore all resources of a specific type
ignore-resources: '["null_resource", "local_file"]'

# Ignore specific resource instances
ignore-resources: '["null_resource.temporary", "local_file.cache"]'

# Mixed: ignore resource types and specific instances
ignore-resources: '["null_resource", "aws_s3_bucket.temp", "local_file"]'
```

## Outputs

| Output | Description | Example |
|--------|-------------|---------|
| `diff-bool` | Whether there are any diffs (true/false) | `true` |
| `diff-count` | Number of resources that have changes | `3` |
| `diff-resources` | JSON array of Terraform resource addresses with changes | `["aws_instance.web","aws_s3_bucket.assets"]` |
| `diff-raw` | Raw Terraform plan output with ignored resources filtered out | Full terraform plan text |
| `diff-json` | structured JSON including detailed resource information | See JSON Structure below |

### diff-json Structure

The `diff-json` output provides a comprehensive, structured view of the Terraform plan analysis:

```json
{
  "hasDiffs": true,
  "summary": {
    "totalChanges": 3,
    "toAdd": 3,
    "toChange": 1,
    "toDestroy": 0
  },
  "resources": [
    {
      "address": "aws_instance.web",
      "resourceType": "aws_instance",
      "action": "create",
      "changes": {
        "before": null,
        "after": "Value will be known after apply",
        "description": "Resource will be created"
      }
    },
    {
      "address": "aws_s3_bucket.assets",
      "resourceType": "aws_s3_bucket",
      "action": "update",
      "changes": {
        "before": "Value will be known after apply",
        "after": "Value will be known after apply",
        "description": "Resource will be updated in-place"
      }
    }
  ],
  "resourceCount": 2,
  "timestamp": "2025-09-15T07:48:22.123Z"
}
```

## Usage

### Basic Usage

```yaml
jobs:
  terraform-plan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3

    - name: Terraform Init
      run: terraform init

    - name: Terraform Plan
      id: plan
      run: terraform plan -no-color

    - name: Parse Plan
      id: parse
      uses: jedipunkz/tf-plan-parser@v1
      with:
        terraform-plan: ${{ steps.plan.outputs.stdout }}
        ignore-resources: '["null_resource"]'

    - name: Display Results
      run: |
        echo "Changes detected: ${{ steps.parse.outputs.diff-bool }}"
        echo "Resources affected: ${{ steps.parse.outputs.diff-count }}"
        echo "Resources: ${{ steps.parse.outputs.diff-resources }}"
```

### Using diff-json with jq

You can extract specific values from the JSON structure using `jq`:

```yaml
    - name: Extract total changes
      run: |
        DIFF_JSON='${{ steps.parse.outputs.diff-json }}'
        if [ -n "$DIFF_JSON" ] && [ "$DIFF_JSON" != "null" ]; then
          TOTAL_CHANGES=$(echo "$DIFF_JSON" | jq -r '.summary.totalChanges // 0')
        else
          TOTAL_CHANGES=0
        fi
        echo "Total changes: $TOTAL_CHANGES"
```

### Advanced Usage with diff-json and PR Comments

```yaml
name: Terraform Plan Analysis

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  terraform-plan:
    name: Parse Terraform Plan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: 1.9.8

    - name: Terraform Init
      run: terraform init
      working-directory: ./terraform

    - name: Terraform Plan
      id: plan
      run: terraform plan -no-color
      working-directory: ./terraform

    - name: Parse Terraform Plan
      id: parse
      uses: jedipunkz/tf-plan-parser@v1
      with:
        terraform-plan: ${{ steps.plan.outputs.stdout }}
        ignore-resources: '["null_resource.ignored_resource"]'

    - name: Extract values with jq
      id: extract-jq
      run: |
        DIFF_JSON='${{ steps.parse.outputs.diff-json }}'
        TOTAL_CHANGES=$(echo "$DIFF_JSON" | jq -r '.summary.totalChanges')
        TO_ADD=$(echo "$DIFF_JSON" | jq -r '.summary.toAdd')
        TO_CHANGE=$(echo "$DIFF_JSON" | jq -r '.summary.toChange')
        TO_DESTROY=$(echo "$DIFF_JSON" | jq -r '.summary.toDestroy')
        RESOURCE_COUNT=$(echo "$DIFF_JSON" | jq -r '.resourceCount')

        echo "total-changes=$TOTAL_CHANGES" >> $GITHUB_OUTPUT
        echo "to-add=$TO_ADD" >> $GITHUB_OUTPUT
        echo "to-change=$TO_CHANGE" >> $GITHUB_OUTPUT
        echo "to-destroy=$TO_DESTROY" >> $GITHUB_OUTPUT
        echo "resource-count=$RESOURCE_COUNT" >> $GITHUB_OUTPUT

    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      env:
        DIFF_JSON: ${{ steps.parse.outputs.diff-json }}
      with:
        script: |
          const diffBool = '${{ steps.parse.outputs.diff-bool }}';
          const diffCount = '${{ steps.parse.outputs.diff-count }}';
          const resources = JSON.parse('${{ steps.parse.outputs.diff-resources }}');
          const totalChanges = '${{ steps.extract-jq.outputs.total-changes }}';
          const toAdd = '${{ steps.extract-jq.outputs.to-add }}';
          const toChange = '${{ steps.extract-jq.outputs.to-change }}';
          const toDestroy = '${{ steps.extract-jq.outputs.to-destroy }}';

          let diffJson;
          try {
            diffJson = JSON.parse(process.env.DIFF_JSON);
          } catch (e) {
            console.log('Failed to parse diff-json:', e);
            diffJson = { resources: [] };
          }

          let body = `## Terraform Plan Analysis (${totalChanges} total changes via jq)\n\n`;

          if (diffBool === 'true') {
            body += `✅ **Changes detected** affecting ${diffCount} resources:\n\n`;

            // Original Changed Resources section
            body += '### Changed Resources\n```\n';
            for (const resource of resources) {
              body += `${resource}\n`;
            }
            body += '```\n\n';

            // Plan Summary
            body += `**Plan Summary**: ${toAdd} to add, ${toChange} to change, ${toDestroy} to destroy\n\n`;

            // Detailed resource changes from diff-json
            body += '### Detailed Resource Changes\n';
            for (const resource of diffJson.resources) {
              const actionEmoji = {
                'create': '➕',
                'update': '🔄',
                'delete': '❌',
                'replace': '🔄'
              }[resource.action] || '🔄';

              body += `${actionEmoji} **${resource.action.toUpperCase()}**: \`${resource.address}\` (${resource.resourceType})\n`;
              body += `   - ${resource.changes.description}\n\n`;
            }
          } else {
            body += '✅ **No changes detected**\n\n';
          }

          body += '---\n*Generated by Terraform Plan Parser*';

          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: body
          });
```


## Development

### Setup
```bash
# Install dependencies
bun install

# Build the action
bun run build
```


## License

MIT

## Author

jedipunkz
