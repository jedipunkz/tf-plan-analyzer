# Terraform Plan Inspector

A GitHub Action to analyze Terraform plan diffs and provide structured output for CI/CD workflows.

## Features

- 📊 Parse Terraform plan output and extract changes
- 🚫 Ignore specific resource types or individual resources via configuration
- 📝 Output structured data for further processing
- 🔄 Support for all Terraform operations (create, update, delete, replace)
- 🧹 Filter ignored resources from raw output for clean display

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `terraform-plan` | Terraform plan output to analyze | Yes | - |
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

## Usage

### Basic Usage

```yaml
- name: Analyze Terraform Plan
  id: analyze
  uses: ./
  with:
    terraform-plan: ${{ steps.plan.outputs.stdout }}
    ignore-resources: '["null_resource"]'

- name: Check if changes exist
  if: steps.analyze.outputs.diff-bool == 'true'
  run: echo "Found ${{ steps.analyze.outputs.diff-count }} resource changes"
```

### Advanced Usage

```yaml
- name: Process each changed resource
  if: steps.analyze.outputs.diff-bool == 'true'
  run: |
    resources='${{ steps.analyze.outputs.diff-resources }}'
    echo "Processing ${{ steps.analyze.outputs.diff-count }} resources:"
    echo $resources | jq -r '.[]' | while read resource; do
      echo "- $resource"
    done

- name: Display filtered plan
  run: |
    echo "Filtered Terraform Plan:"
    echo "${{ steps.analyze.outputs.diff-raw }}"
```

### Conditional Workflows

```yaml
- name: Skip deployment if no important changes
  if: steps.analyze.outputs.diff-bool == 'false'
  run: echo "No infrastructure changes detected, skipping deployment"

- name: Require approval for many changes
  if: steps.analyze.outputs.diff-count > '10'
  uses: ./.github/actions/require-approval
```


## Development

### Setup
```bash
# Install dependencies
bun install

# Build the action
bun run build
```

### Testing
```bash
# Test with example Terraform code
cd example/terraform
terraform init
terraform plan

# Test with GitHub Act (local testing)
gh act --container-architecture linux/amd64 -j terraform-plan
```

### Building for Distribution
```bash
# Build for distribution (required before committing)
bun run build
git add dist/
git commit -m "Update distribution"
```

## License

MIT

## Author

jedipunkz
