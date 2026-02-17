#!/usr/bin/env python3
from __future__ import annotations

import argparse
import dataclasses
import json
import os
from pathlib import Path
from typing import Any, Literal


Format = Literal["ascii", "markdown"]


@dataclasses.dataclass(frozen=True)
class DesignSystem:
    project: str
    query: str
    product_type: str
    industry: str
    style: str
    palette: dict[str, str]
    typography: dict[str, str]
    effects: dict[str, str]
    layout: dict[str, str]
    accessibility_notes: list[str]
    anti_patterns: list[str]


WARM_BRUTALISM_PALETTE = {
    "background": "#F5F0E8",
    "foreground": "#2D2A26",
    "card": "#FFFDF9",
    "primary": "#C75D3A",
    "primary_foreground": "#FFFDF9",
    "secondary": "#E8DDD4",
    "muted_foreground": "#6B6560",
    "accent": "#D4A03E",
    "accent_foreground": "#1A1816",
    "success": "#7D9A78",
    "success_foreground": "#FFFDF9",
    "destructive": "#B84233",
    "border": "#D4CEC4",
}


DEFAULT_TYPOGRAPHY = {
    "display": "Bricolage Grotesque",
    "body": "Satoshi",
    "base_size": "16px",
    "body_line_height": "1.5–1.75",
    "max_line_length": "65–75 characters",
}


DEFAULT_EFFECTS = {
    "radius": "16px baseline (rounded-2xl)",
    "border": "2px subtle, 3px emphasis (border-3)",
    "shadow": "stamp shadows (shadow-stamp / shadow-stamp-sm)",
    "motion": "150–250ms micro-interactions; transform/opacity only",
}


DEFAULT_LAYOUT = {
    "app_max_width": "max-w-7xl",
    "content_max_width": "max-w-5xl (dashboards), max-w-3xl (forms), max-w-md (onboarding)",
    "spacing_rhythm": "Tailwind 4/6/8 steps; avoid random px values",
    "mobile_targets": "44×44px minimum touch targets",
}


DOMAIN_GUIDES: dict[str, list[str]] = {
    "product": [
        "Make curriculum/objectives the backbone: show the active objective on every practice surface.",
        "Reduce anxiety: voice features must be explicit, controllable, and forgiving (stop/retry).",
        "Design for habit loops: streaks, reminders, and ‘resume last session’ as primary actions.",
    ],
    "style": [
        "Pick one visual language across the whole authenticated journey (avoid ‘two apps’ feeling).",
        "Use thick borders + stamp shadows sparingly in data-dense views (teacher dashboard).",
        "Avoid emoji icons in UI; stick to a single icon family (Lucide).",
    ],
    "color": [
        "Use warm brutalism tokens (primary/accent/success/secondary) consistently.",
        "Avoid using primary as body text on light background unless contrast is verified.",
        "Use color + shape/text, not color-only, for status and selection states.",
    ],
    "typography": [
        "Use display font for headings only; keep body readable and calm.",
        "Keep body at 16px+ on mobile; avoid cramped line-height.",
        "Prefer sentence case and short lines in chat and feedback UI.",
    ],
    "landing": [
        "Hero: one clear promise + one primary CTA; add one secondary CTA (schools/teachers).",
        "Social proof: testimonials + measurable outcomes + trust signals (privacy, accuracy).",
        "Explain the learning loop in 3–4 steps (diagnose → practice → feedback → improve).",
    ],
    "ux": [
        "Accessibility: visible focus rings, keyboard nav, proper labels, 4.5:1 contrast for normal text.",
        "Touch: 44×44px targets; don’t rely on hover for primary actions.",
        "Performance: avoid layout shift; reserve space for async content; lazy-load heavy visuals.",
        "Motion: respect prefers-reduced-motion for non-essential and infinite animations.",
    ],
    "chart": [
        "Use charts sparingly; always provide a textual summary for accessibility.",
        "Use consistent warm palette; avoid default neon chart colors.",
        "Prefer trend lines (area/line) for progress and bars for comparisons.",
    ],
}


STACK_GUIDES: dict[str, list[str]] = {
    "html-tailwind": [
        "Use semantic elements (button/a/label) and utility classes derived from tokens.",
        "Avoid arbitrary colors (slate/purple) in product UI; use theme tokens.",
        "Prefer consistent containers: max-w-7xl shell, max-w-5xl content.",
    ],
    "react": [
        "Centralize UI primitives (Button/Input/Card) and reuse everywhere for consistency.",
        "Prefer declarative state for loading/empty/error; avoid ad-hoc spinners per page.",
        "Use Radix primitives for accessibility; ensure aria-labels for icon buttons.",
    ],
    "shadcn": [
        "Keep variants minimal; align shadcn components to your tokens and border/shadow style.",
        "Audit focus rings and disabled states after theming changes.",
    ],
}


def _infer_product_type_and_industry(query: str) -> tuple[str, str]:
    q = query.lower()
    if any(k in q for k in ("edtech", "education", "learning", "tutor", "language")):
        return ("B2C learning app", "EdTech / Language learning")
    if any(k in q for k in ("dashboard", "admin", "teacher", "school")):
        return ("B2B dashboard", "EdTech / Schools")
    return ("Web app", "General")


def generate_design_system(query: str, project: str) -> DesignSystem:
    product_type, industry = _infer_product_type_and_industry(query)
    return DesignSystem(
        project=project,
        query=query,
        product_type=product_type,
        industry=industry,
        style="Warm neo-brutalism (thick borders, stamp shadows, bold typography)",
        palette=WARM_BRUTALISM_PALETTE,
        typography=DEFAULT_TYPOGRAPHY,
        effects=DEFAULT_EFFECTS,
        layout=DEFAULT_LAYOUT,
        accessibility_notes=[
            "Ensure 4.5:1 contrast for normal text (buttons included).",
            "Icon-only buttons must have aria-label; focus rings must be visible.",
            "Minimum 44×44px touch targets; don’t depend on hover.",
        ],
        anti_patterns=[
            "Mixing unrelated palettes (e.g., slate/purple) inside the authenticated journey.",
            "Using emoji as UI icons (use Lucide/SVG instead).",
            "Using confirm() for destructive actions instead of branded dialogs.",
            "Click handlers on divs instead of semantic buttons/links.",
        ],
    )


def render_design_system(ds: DesignSystem, fmt: Format) -> str:
    if fmt == "markdown":
        return "\n".join(
            [
                f"# Design System — {ds.project}",
                "",
                f"**Query:** {ds.query}",
                "",
                "## Summary",
                f"- **Product type:** {ds.product_type}",
                f"- **Industry:** {ds.industry}",
                f"- **Style:** {ds.style}",
                "",
                "## Palette",
                "```json",
                json.dumps(ds.palette, indent=2),
                "```",
                "",
                "## Typography",
                "```json",
                json.dumps(ds.typography, indent=2),
                "```",
                "",
                "## Effects",
                "```json",
                json.dumps(ds.effects, indent=2),
                "```",
                "",
                "## Layout",
                "```json",
                json.dumps(ds.layout, indent=2),
                "```",
                "",
                "## Accessibility Notes",
                *[f"- {note}" for note in ds.accessibility_notes],
                "",
                "## Anti-patterns to Avoid",
                *[f"- {item}" for item in ds.anti_patterns],
                "",
            ]
        ).strip() + "\n"

    # ASCII-ish (terminal friendly)
    lines: list[str] = []
    lines.append(f"DESIGN SYSTEM — {ds.project}")
    lines.append(f"Query: {ds.query}")
    lines.append("")
    lines.append(f"Product: {ds.product_type}  |  Industry: {ds.industry}")
    lines.append(f"Style:   {ds.style}")
    lines.append("")
    lines.append("Palette:")
    for k, v in ds.palette.items():
        lines.append(f"  - {k:18} {v}")
    lines.append("")
    lines.append("Typography:")
    for k, v in ds.typography.items():
        lines.append(f"  - {k:18} {v}")
    lines.append("")
    lines.append("Effects:")
    for k, v in ds.effects.items():
        lines.append(f"  - {k:18} {v}")
    lines.append("")
    lines.append("Layout:")
    for k, v in ds.layout.items():
        lines.append(f"  - {k:18} {v}")
    lines.append("")
    lines.append("Accessibility:")
    for note in ds.accessibility_notes:
        lines.append(f"  - {note}")
    lines.append("")
    lines.append("Anti-patterns:")
    for item in ds.anti_patterns:
        lines.append(f"  - {item}")
    lines.append("")
    return "\n".join(lines)


def persist_design_system(ds_markdown: str, project_root: Path, page: str | None) -> list[Path]:
    written: list[Path] = []
    base_dir = project_root / "design-system"
    base_dir.mkdir(parents=True, exist_ok=True)

    master_path = base_dir / "MASTER.md"
    master_path.write_text(ds_markdown, encoding="utf-8")
    written.append(master_path)

    if page:
        pages_dir = base_dir / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)
        page_path = pages_dir / f"{page}.md"
        page_path.write_text(
            f"# Page Override — {page}\n\n(Override file created by ui-ux-pro-max search tool.)\n",
            encoding="utf-8",
        )
        written.append(page_path)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="ui-ux-pro-max — local design helper")
    parser.add_argument("query", nargs="?", default="", help="Search query / description")
    parser.add_argument("--design-system", action="store_true", help="Generate a design system")
    parser.add_argument("--persist", action="store_true", help="Persist design-system/ files")
    parser.add_argument("-p", "--project", default="Project", help="Project name")
    parser.add_argument("--page", default=None, help="Optional page override name")
    parser.add_argument("--domain", default=None, help="Domain: product/style/color/typography/landing/ux/chart")
    parser.add_argument("--stack", default=None, help="Stack: html-tailwind/react/shadcn/...")
    parser.add_argument("-n", "--max-results", type=int, default=8, help="Max results for domain guides")
    parser.add_argument("-f", "--format", default="ascii", choices=["ascii", "markdown"], help="Output format")

    args = parser.parse_args()

    fmt: Format = args.format  # type: ignore[assignment]
    query = args.query.strip()

    if not query and not args.design_system and not args.domain and not args.stack:
        parser.print_help()
        return 2

    if args.design_system:
        ds = generate_design_system(query or args.project, args.project)
        out = render_design_system(ds, fmt="markdown" if args.persist else fmt)
        print(out, end="")
        if args.persist:
            project_root = Path(os.getcwd())
            written = persist_design_system(out, project_root=project_root, page=args.page)
            for path in written:
                print(f"[persisted] {path}")
        return 0

    if args.domain:
        domain = args.domain.strip().lower()
        items = DOMAIN_GUIDES.get(domain)
        if not items:
            raise SystemExit(f"Unknown domain: {args.domain}")
        items = items[: max(1, args.max_results)]
        if fmt == "markdown":
            print(f"# Domain — {domain}\n")
            for item in items:
                print(f"- {item}")
            print()
        else:
            print(f"DOMAIN — {domain}\n")
            for item in items:
                print(f"- {item}")
            print()
        return 0

    if args.stack:
        stack = args.stack.strip().lower()
        items = STACK_GUIDES.get(stack)
        if not items:
            items = [
                "Prefer tokens and shared UI primitives for consistent UI.",
                "Audit focus/contrast and responsive behavior after changes.",
            ]
        if fmt == "markdown":
            print(f"# Stack — {stack}\n")
            for item in items:
                print(f"- {item}")
            print()
        else:
            print(f"STACK — {stack}\n")
            for item in items:
                print(f"- {item}")
            print()
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

