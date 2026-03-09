from __future__ import annotations

from typing import Any


SCAFFOLD_STEP_INSTRUCTIONS = {
    "wait": "Hold space first and let the learner try before you help.",
    "context_hint": "Give a situational cue tied to the scenario, role, or communicative goal instead of supplying the answer.",
    "choice_prompt": "Offer a small forced choice or contrast so the learner still has to select and produce language.",
    "model_and_retry": "Model the target form only after earlier steps fail, then ask the learner to try again.",
}


def build_scaffold_ladder_prompt(scaffold_policy: dict[str, Any] | None) -> str:
    scaffold_policy = scaffold_policy if isinstance(scaffold_policy, dict) else {}
    silence_tolerance_ms = max(0, int(scaffold_policy.get("silenceToleranceMs", 3000) or 3000))
    hint_ladder = scaffold_policy.get("hintLadder", [])
    max_modeling_steps = max(0, int(scaffold_policy.get("maxModelingSteps", 1) or 1))

    ordered_steps = [
        step
        for step in hint_ladder
        if isinstance(step, str) and step.strip()
    ] or ["wait", "context_hint", "choice_prompt", "model_and_retry"]

    lines = [
        f"Allow brief productive silence for up to about {silence_tolerance_ms} ms before stepping in.",
        "Use the scaffold ladder in order instead of jumping straight to the full answer.",
    ]

    for index, step in enumerate(ordered_steps, start=1):
        instruction = SCAFFOLD_STEP_INSTRUCTIONS.get(step, "Use the configured support move without removing the learner's responsibility.")
        lines.append(f"Step {index} ({step}): {instruction}")

    if max_modeling_steps <= 0:
        lines.append("Avoid full modeling unless task completion would otherwise stall completely.")
    else:
        lines.append(
            f"Limit full model-and-retry support to about {max_modeling_steps} modeling step(s) for the same struggle point before moving on."
        )

    return "SCAFFOLD LADDER:\n" + "\n".join(f"- {line}" for line in lines)
