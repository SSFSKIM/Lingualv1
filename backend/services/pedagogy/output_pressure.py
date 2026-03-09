from __future__ import annotations

from typing import Any


def build_output_pressure_prompt(
    output_policy: dict[str, Any] | None,
    *,
    assignment: dict[str, Any] | None,
    pedagogy: dict[str, Any] | None,
) -> str:
    output_policy = output_policy if isinstance(output_policy, dict) else {}
    assignment = assignment if isinstance(assignment, dict) else {}
    pedagogy = pedagogy if isinstance(pedagogy, dict) else {}

    min_student_turn_words = max(1, int(output_policy.get("minStudentTurnWords", 8) or 8))
    follow_up_pressure = output_policy.get("followUpPressure", "balanced")
    allow_clarification_requests = bool(output_policy.get("allowClarificationRequests", True))
    evidence = pedagogy.get("evidence", {}) if isinstance(pedagogy.get("evidence"), dict) else {}

    lines = [
        f"Aim for learner turns of roughly {min_student_turn_words}+ words when the task naturally allows it.",
        "Do not accept one-word or fragment answers as task completion if the learner can reasonably elaborate.",
    ]

    if follow_up_pressure == "light":
        lines.append(
            "Use gentle expansion prompts such as asking for one more detail, reason, or example after short responses."
        )
    elif follow_up_pressure == "high":
        lines.append(
            "Actively press for elaboration with follow-up questions, comparisons, and justification until the learner produces fuller output."
        )
    else:
        lines.append(
            "Use moderate follow-up pressure: ask for clarification, justification, or one extra detail when the learner stays too brief."
        )

    if allow_clarification_requests:
        lines.append(
            "Allow the learner to ask for clarification or repetition, but answer in a way that returns responsibility to the learner."
        )
    else:
        lines.append(
            "Keep clarification support minimal so the learner must stay in productive output mode."
        )

    min_turns = evidence.get("minTurns")
    if isinstance(min_turns, int) and min_turns > 0:
        lines.append(f"Use follow-ups and wait time to help the learner reach the target turn volume of about {min_turns} turns.")

    success_criteria = assignment.get("successCriteria", [])
    if isinstance(success_criteria, list) and success_criteria:
        lines.append("Tie elaboration requests back to the assignment success criteria whenever possible.")

    return "OUTPUT PRESSURE:\n" + "\n".join(f"- {line}" for line in lines)
