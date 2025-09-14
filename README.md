# Terraform Plan Inspector

A GitHub Action to analyze Terraform plan diffs and provide structured output for CI/CD workflows.

## Features

- 📊 Parse Terraform plan output and extract changes
- 🚫 Ignore specific resource types via configuration
- 📝 Output structured data (JSON) for further processing
- 🔄 Support for all Terraform operations (create, update, delete, replace)

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `terraform-plan` | Terraform plan output to analyze | Yes | - |
| `ignore-resources` | JSON array of resource types to ignore | No | `[]` |

## Outputs

| Output | Description |
|--------|-------------|
| `diff` | Whether there are any diffs (true/false) |
| `all-diffs` | JSON string containing all diffs found |
| `resources` | JSON array of Terraform resource names that have changes |

## Usage

```yaml
- name: Analyze Terraform Plan
  id: analyze
  uses: ./
  with:
    terraform-plan: ${{ steps.plan.outputs.stdout }}
    ignore-resources: '["null_resource", "local_file"]'

- name: Check if changes exist
  if: steps.analyze.outputs.diff == 'true'
  run: echo "Changes detected!"
```

## Example

See the complete example in [`.github/workflows/terraform-plan-check.yml`](./.github/workflows/terraform-plan-check.yml).

## Development

1. Install dependencies:
```bash
bun install
```

2. Build the action:
```bash
bun run build
```

3. Test with example Terraform code:
```bash
cd example/terraform
terraform init
terraform plan
```

## License

MIT