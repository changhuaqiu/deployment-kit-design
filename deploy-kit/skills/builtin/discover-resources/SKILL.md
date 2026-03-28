---
name: discover-resources
description: Use when you need to collect existing resources from HuaweiHIS platform. Supports resource types including ads, workload, service, configmap, and persistentvolumeclaim.
---

Collect existing resources from HuaweiHIS platform via MCP service.

## When To Use This Skill

Use this skill when:
- You need to discover resources before generating XaC code
- You want to understand the current state of HuaweiHIS resources
- You need to analyze existing infrastructure before deployment
- As the first step in the new-user workflow

## What This Skill Does

1. **Connects to MCP service**:
   - Establishes connection to huaweihis MCP service
   - Lists available resource tools
   - Validates tool availability

2. **Collects resources serially**:
   - Collects each resource type one by one (ads, workload, service, etc.)
   - Uses 30-second timeout per resource type
   - Handles partial failures gracefully

3. **Parses and standardizes**:
   - Converts MCP responses to standard Resource format
   - Extracts common fields (id, name, namespace, status)
   - Groups resources by type

4. **Caches results**:
   - Saves to `.deployment-kit/cache/{appid}/resources/`
   - Includes manifest.json, resources.json, metadata.json
   - Supports 1-hour default TTL with version checking

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| resource_types | array | No | Resource types to collect (default: all available) |
| cache_ttl | integer | No | Cache TTL in seconds (default: 3600) |
| enable_progress | boolean | No | Enable progress display (default: false) |

## Outputs

| Field | Type | Description |
|-------|------|-------------|
| manifest | object | Collection metadata (counts, timestamps, version) |
| resources | object | Resources grouped by type |
| errors | array | List of failed resource types with reasons |

## Error Handling

| Error Type | When it happens | Is retryable |
|------------|-----------------|--------------|
| MCPConnectionError | MCP service unavailable | Yes |
| MCPTimeoutError | Resource type collection exceeds 30s | Yes |
| ResourceTypeNotFoundError | Requested tool doesn't exist | No |
| ResourceParseError | Data parsing fails | No (continues with other types) |
| CacheSaveError | Cache write fails | No (returns data without caching) |

## Examples

```bash
# Collect all resource types
dk discover-resources --appid app-123

# Collect specific types
dk discover-resources --appid app-123 --resource-types ads,workload

# Custom cache TTL
dk discover-resources --appid app-123 --cache-ttl 7200

# Force refresh (ignore cache)
dk discover-resources --appid app-123 --force
```

## Related Skills

- **generate-xac**: Uses collected resources to generate XaC code
- **validate-plan**: Validates deployment plans against current state
- **analyze-failure**: Analyzes failures using resource state information
