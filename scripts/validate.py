#!/usr/bin/env python3
"""Validate the template's own configuration without third-party packages."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILES = (
    ".devcontainer/devcontainer.json",
    ".vscode/extensions.json",
    ".vscode/settings.json",
)
WORKFLOW_DIR = Path(".github/workflows")
ACTION_REFERENCE = re.compile(r"^[0-9a-fA-F]{40}$")


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


def main() -> int:
    errors = validate_json_files()
    errors.extend(validate_action_pins())

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Repository configuration checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
