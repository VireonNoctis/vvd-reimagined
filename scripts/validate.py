#!/usr/bin/env python3
"""Validate repository configuration and the research documentation index."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILES = (
    ".devcontainer/devcontainer.json",
    ".vscode/extensions.json",
    ".vscode/settings.json",
)
REQUIRED_DOCS = (
    "docs/README.md",
    "docs/RESEARCH.md",
    "docs/PRODUCT_MODEL.md",
    "docs/FEATURE_INVENTORY.md",
    "docs/QUILL.md",
    "docs/WORKSPACE_INTERACTIONS.md",
    "docs/PLATFORM_AND_COLLABORATION.md",
    "docs/WORKSHOP_RUNTIME.md",
    "docs/PUBLISHING_AND_WIKI.md",
    "docs/PLANS_AND_ENTITLEMENTS.md",
    "docs/DESIGN_RECONSTRUCTION.md",
    "docs/ARCHITECTURE.md",
    "docs/ROADMAP.md",
    "docs/OPEN_QUESTIONS.md",
    "docs/PROJECT_SETUP.md",
)
WORKFLOW_DIR = Path(".github/workflows")
ACTION_REFERENCE = re.compile(r"^[0-9a-fA-F]{40}$")
MARKDOWN_LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
EXTERNAL_PREFIXES = ("https://", "http://", "mailto:", "tel:", "data:")


def validate_json_files() -> list[str]:
    errors: list[str] = []

    for relative_path in CONFIG_FILES:
        path = ROOT / relative_path
        if not path.exists():
            continue

        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"{relative_path}: invalid JSON ({exc})")

    return errors


def validate_action_pins() -> list[str]:
    errors: list[str] = []
    workflow_root = ROOT / WORKFLOW_DIR

    if not workflow_root.exists():
        return errors

    for path in sorted((*workflow_root.rglob("*.yml"), *workflow_root.rglob("*.yaml"))):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read workflow ({exc})")
            continue

        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped.startswith("uses:"):
                continue

            reference = stripped.split(":", 1)[1].split("#", 1)[0].strip().strip("'\"")
            if reference.startswith(("./", "docker://")):
                continue

            if "@" not in reference:
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: "
                    f"Action reference is not pinned: {reference}"
                )
                continue

            revision = reference.rsplit("@", 1)[1]
            if not ACTION_REFERENCE.fullmatch(revision):
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: "
                    f"Action must use a full 40-character commit SHA: {reference}"
                )

    return errors


def validate_required_docs() -> list[str]:
    return [
        f"{relative_path}: required research document is missing"
        for relative_path in REQUIRED_DOCS
        if not (ROOT / relative_path).is_file()
    ]


def validate_markdown_links() -> list[str]:
    errors: list[str] = []

    for path in sorted(ROOT.rglob("*.md")):
        if ".git" in path.parts:
            continue

        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read Markdown ({exc})")
            continue

        for match in MARKDOWN_LINK.finditer(content):
            destination = match.group(1).strip()
            if destination.startswith("<") and ">" in destination:
                destination = destination[1 : destination.index(">")]
            else:
                destination = destination.split(maxsplit=1)[0] if destination else ""

            if not destination or destination.startswith(EXTERNAL_PREFIXES):
                continue

            local_target = destination.split("#", 1)[0].split("?", 1)[0]
            if not local_target:
                continue

            decoded = unquote(local_target)
            candidate = (path.parent / decoded).resolve()
            try:
                candidate.relative_to(ROOT)
            except ValueError:
                errors.append(
                    f"{path.relative_to(ROOT)}: link escapes repository: {destination}"
                )
                continue

            if not candidate.exists():
                errors.append(
                    f"{path.relative_to(ROOT)}: broken local link: {destination}"
                )

    return errors


def main() -> int:
    errors = validate_json_files()
    errors.extend(validate_action_pins())
    errors.extend(validate_required_docs())
    errors.extend(validate_markdown_links())

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Repository configuration and documentation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
