from __future__ import annotations

from typing import Any


def build_feedback_mode_prompt(feedback_policy: dict[str, Any] | None) -> str:
    feedback_policy = feedback_policy if isinstance(feedback_policy, dict) else {}
    mode = feedback_policy.get("mode", "balanced")
    target_only_strict = bool(feedback_policy.get("targetOnlyStrict", False))

    if mode == "fluency_first":
        lines = [
            "Prioritize flow and confidence over interruption frequency.",
            "Keep corrections short, embedded, and easy to ignore if the learner is still communicating successfully.",
            "Do not turn every grammar issue into a teaching stop unless it blocks comprehension or the mapped target requires it.",
        ]
    elif mode == "accuracy_first":
        lines = [
            "Prioritize accurate production of the mapped targets over conversational speed.",
            "Notice incorrect target-language forms early and move to guided self-correction sooner.",
            "Use brief explicit cues when needed so the learner understands what form needs repair.",
        ]
    else:
        lines = [
            "Balance fluency support with timely corrective feedback.",
            "Let the learner keep momentum, but do not ignore repeated target-language errors.",
            "Escalate feedback only when the learner keeps missing the same target or the task goal is drifting.",
        ]

    if target_only_strict:
        lines.append(
            "Keep feedback tightly anchored to the mapped targets, focus grammar, and assignment success criteria."
        )
    else:
        lines.append(
            "Favor mapped targets first, but you may briefly support nearby language if it directly helps task completion."
        )

    return "FEEDBACK MODE DIRECTIVE:\n" + "\n".join(f"- {line}" for line in lines)
