# discover-resources Usage Examples

## Basic Usage

```python
from skills.builtin.discover_resources import Skill

# Initialize skill
skill = Skill({
    'name': 'discover-resources',
    'version': '1.0.0',
    'description': 'Collect resources from HuaweiHIS'
})

# Execute
context = {
    'appid': 'app-123',
    'params': {
        'resource_types': ['ads', 'workload'],
        'cache_ttl': 3600
    }
}

result = skill.execute(context)
print(f"Collected {result['data']['manifest']['total_resources']['total']} resources")
```

## Output Format

```json
{
  "status": "success",
  "message": "Successfully collected 10 resources",
  "data": {
    "manifest": {
      "appid": "app-123",
      "collected_at": "2026-03-28T10:00:00Z",
      "resource_types": ["ads", "workload"],
      "total_resources": {
        "ads": 2,
        "workload": 3,
        "total": 5
      }
    },
    "resources": {
      "ads": [
        {
          "id": "cluster-1",
          "type": "ads",
          "name": "app-cluster",
          "namespace": "default",
          "status": "Running"
        }
      ],
      "workload": [...]
    }
  }
}
```
