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

    - name: Analyze Plan
      id: analyze
      uses: jedipunkz/tf-plan-parser@v1
      with:
        terraform-plan: ${{ steps.plan.outputs.stdout }}
        ignore-resources: '["null_resource"]'

    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const diffBool = '${{ steps.analyze.outputs.diff-bool }}';
          const diffCount = '${{ steps.analyze.outputs.diff-count }}';

          if (diffBool === 'true') {
            const body = `## Terraform Plan Analysis\n\n✅ **${diffCount} resources will be changed**`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
          }
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
