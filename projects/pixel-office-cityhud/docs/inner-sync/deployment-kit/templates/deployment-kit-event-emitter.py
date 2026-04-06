import json
import sys
import time


def emit_deploykit_event(event: dict) -> None:
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()


def emit_scenario_detected(session_id: str, scenario: str, confidence: float) -> None:
    emit_deploykit_event(
        {
            "kind": "scenario_detected",
            "sessionId": session_id,
            "scenario": scenario,
            "confidence": confidence,
            "at": int(time.time() * 1000),
        }
    )


def emit_workflow_selected(session_id: str, workflow_id: str, workflow_name: str, total_skills: int) -> None:
    emit_deploykit_event(
        {
            "kind": "workflow_selected",
            "sessionId": session_id,
            "workflowId": workflow_id,
            "workflowName": workflow_name,
            "totalSkills": total_skills,
            "at": int(time.time() * 1000),
        }
    )
