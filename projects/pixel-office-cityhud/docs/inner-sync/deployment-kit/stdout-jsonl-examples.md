# Deployment Kit Stdout JSONL Examples

## scenario_detected

```json
{"kind":"scenario_detected","sessionId":"ses_001","scenario":"init","confidence":0.94,"at":1775487000000}
```

## workflow_selected

```json
{"kind":"workflow_selected","sessionId":"ses_001","workflowId":"wf_init","workflowName":"init-service","totalSkills":5,"at":1775487000100}
```

## skill_started

```json
{"kind":"skill_started","sessionId":"ses_001","workflowId":"wf_init","skillId":"discover-resources","skillName":"discover-resources","index":1,"total":5,"at":1775487000200}
```

## skill_completed

```json
{"kind":"skill_completed","sessionId":"ses_001","workflowId":"wf_init","skillId":"discover-resources","result":"success","at":1775487000500}
```

## approval_required

```json
{"kind":"approval_required","sessionId":"ses_001","workflowId":"wf_init","gateId":"gate_1","message":"Need approval to deploy","at":1775487000600}
```

## workflow_completed

```json
{"kind":"workflow_completed","sessionId":"ses_001","workflowId":"wf_init","status":"success","at":1775487001000}
```
