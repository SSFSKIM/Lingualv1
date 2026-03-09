from __future__ import annotations

from typing import Any


def _context_summary(curriculum: dict[str, Any] | None) -> str:
    curriculum = curriculum if isinstance(curriculum, dict) else {}
    situation = curriculum.get("situation", {}) if isinstance(curriculum.get("situation"), dict) else {}
    seed = situation.get("seed", {}) if isinstance(situation.get("seed"), dict) else {}
    setting = seed.get("setting")
    roles = seed.get("roles")

    context_parts: list[str] = []
    if isinstance(setting, str) and setting.strip():
        context_parts.append(f"setting={setting.strip()}")
    if isinstance(roles, list) and roles:
        normalized_roles = [role.strip() for role in roles if isinstance(role, str) and role.strip()]
        if normalized_roles:
            context_parts.append(f"roles={', '.join(normalized_roles)}")

    return ", ".join(context_parts) if context_parts else "no explicit scenario metadata was resolved"


def build_task_template_prompt(
    *,
    task_type: str,
    assignment: dict[str, Any] | None,
    curriculum: dict[str, Any] | None,
    pedagogy: dict[str, Any] | None,
) -> str:
    assignment = assignment if isinstance(assignment, dict) else {}
    pedagogy = pedagogy if isinstance(pedagogy, dict) else {}
    evidence = pedagogy.get("evidence", {}) if isinstance(pedagogy.get("evidence"), dict) else {}
    min_turns = evidence.get("minTurns")
    context_summary = _context_summary(curriculum)

    if task_type == "information_gap":
        lines = [
            "Play a role where some necessary information is distributed across turns rather than revealed all at once.",
            "Make the learner ask targeted questions, confirm details, and fill missing information to complete the task.",
            "Do not collapse the task by volunteering every missing detail in one response.",
        ]
    elif task_type == "opinion_gap":
        lines = [
            "Push the learner to state a viewpoint, justify it, compare it with another perspective, and respond to follow-up challenges.",
            "Ask for reasons, examples, and clarification when the learner gives only a preference label.",
            "Keep the exchange centered on defending and refining the learner's opinion rather than just listing facts.",
        ]
    else:
        lines = [
            "Frame the exchange as a negotiation toward one clear decision or recommendation.",
            "Present trade-offs, ask the learner to compare options, and require a final choice with justification.",
            "Do not end the task until the pair has reached or clearly rejected a decision.",
        ]

    if isinstance(min_turns, int) and min_turns > 0:
        lines.append(f"Keep the interaction going long enough to support at least about {min_turns} learner turns when possible.")

    description = assignment.get("description")
    if isinstance(description, str) and description.strip():
        lines.append(f"Assignment framing to preserve: {description.strip()}")

    lines.append(f"Resolved scenario context: {context_summary}.")

    return "TASK TEMPLATE DIRECTIVE:\n" + "\n".join(f"- {line}" for line in lines)
