from __future__ import annotations

from typing import Any


def build_correction_ladder_prompt(feedback_policy: dict[str, Any] | None) -> str:
    feedback_policy = feedback_policy if isinstance(feedback_policy, dict) else {}
    recast_default = bool(feedback_policy.get("recastDefault", True))
    elicitation_repeat_threshold = max(
        1,
        int(feedback_policy.get("elicitationRepeatThreshold", 3) or 3),
    )
    end_review_enabled = bool(feedback_policy.get("endReviewEnabled", True))

    ladder_lines = []
    if recast_default:
        ladder_lines.append(
            "First target error encounter: use a brief natural recast and continue the task without turning it into a lecture."
        )
    else:
        ladder_lines.append(
            "First target error encounter: move directly to a short elicitation cue instead of a silent recast."
        )

    ladder_lines.extend(
        [
            (
                f"When the same error family repeats {elicitation_repeat_threshold} time(s), "
                "pause briefly and ask the learner to repair it."
            ),
            "If the learner self-corrects, acknowledge briefly and resume the task immediately.",
            "If the learner cannot self-correct after a short attempt, provide the model and ask for one retry before moving on.",
        ]
    )

    if end_review_enabled:
        ladder_lines.append(
            "Near the end of the session, summarize 1-3 recurring issues with short metalinguistic review items tied to the learner's actual errors."
        )
    else:
        ladder_lines.append(
            "Do not add a formal end-of-session review block unless the learner explicitly asks for one."
        )

    return "CORRECTION LADDER:\n" + "\n".join(f"- {line}" for line in ladder_lines)
