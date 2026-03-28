---
name: validate-syntax
description: Use when you need to validate YAML syntax in XaC artifacts. Supports URLs, ZIP files, and local directories.
---

Validate YAML syntax in XaC deployment artifacts.

## When To Use This Skill

Use this skill when:
- You need to verify YAML syntax before deployment
- You receive an XaC artifact from an external source
- You want to catch syntax errors early in the workflow
- After generating XaC code with generate-xac skill

## What This Skill Does

1. **Prepares the artifact**:
   - Downloads ZIP from URL (if applicable)
   - Extracts ZIP file (if applicable)
   - Uses directory as-is (if directory provided)

2. **Scans for YAML files**:
   - Recursively finds all `.yaml` and `.yml` files
   - Builds a list of files to validate

3. **Validates syntax**:
   - Checks each file for YAML syntax errors
   - Collects detailed error information (file, line, error message)

4. **Returns validation report**:
   - Total files checked
   - Valid/invalid counts
   - Detailed error list

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| artifact_source | string | Yes | URL, ZIP path, or directory path |
| download_timeout | integer | No | Download timeout in seconds (default: 300) |

## Outputs

| Field | Type | Description |
|-------|------|-------------|
| valid | boolean | Overall validation result |
| total_files | integer | Total YAML files found |
| valid_files | integer | Files with valid syntax |
| invalid_files | integer | Files with syntax errors |
| errors | array | List of error details |
| artifact_info | object | Artifact processing information |

## Error Handling

| Error Type | When it happens | Is retryable |
|------------|-----------------|--------------|
| ArtifactNotFoundError | URL/ZIP/file not found (404, file doesn't exist) | No |
| ArtifactAccessError | Network or permission issues | Yes |
| ArtifactFormatError | Corrupted ZIP file | No |
| YamlSyntaxError | Invalid YAML syntax | No (continues checking) |
| ValidationError | No YAML files found | No |

## Examples

```bash
# Validate from URL
dk validate-syntax --artifact http://example.com/xac-artifact.zip

# Validate from local ZIP
dk validate-syntax --artifact ./xac-package.zip

# Validate from directory
dk validate-syntax --artifact ./my-app/xac

# With custom timeout
dk validate-syntax --artifact http://example.com/xac.zip --timeout 600

# Verbose output
dk validate-syntax --artifact ./xac.zip --verbose
```

## Related Skills

- **generate-xac**: Creates XaC artifacts (run validate-syntax after)
- **test-deploy**: Deploys to test environment (requires valid syntax)
- **review-code**: Reviews code quality (complements syntax validation)

## Implementation Notes

- Uses PyYAML's `safe_load()` for security (prevents remote code execution)
- Limits extracted ZIP size to prevent ZIP bomb attacks
- Validates paths to prevent directory traversal attacks
- Continues checking all files even if errors are found
- Returns detailed error information for each file with issues
