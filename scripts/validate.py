#!/usr/bin/env python3
"""Validate repository configuration, app scaffold and local documentation links."""

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
    "package.json",
    "tsconfig.json",
)
REQUIRED_DOCS = (
    "docs/README.md",
    "docs/RESEARCH.md",
    "docs/INSTAGRAM_RESEARCH.md",
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
REQUIRED_APP_FILES = (
    ".nvmrc",
    "next-env.d.ts",
    "next.config.ts",
    "eslint.config.mjs",
    ".github/workflows/ci.yml",
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/globals.css",
    "src/app/not-found.tsx",
    "src/app/worlds/[worldSlug]/page.tsx",
    "src/domain/world.ts",
    "src/data/demo-world.ts",
    "src/components/ui/icon.tsx",
    "src/components/workspace/workspace.tsx",
    "tests/domain/world.test.mjs",
)
WORKFLOW_DIR = Path(".github/workflows")
ACTION_REFERENCE = re.compile(r"^[0-9a-fA-F]{40}$")
MARKDOWN_LINK = re.compile(r"(?<!!)\\[[^\\]]+\\]\\(([^)]+)\\)")
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


def validate_package() -> list[str]:
    package_path = ROOT / "package.json"
    if not package_path.is_file():
        return ["package.json: required application manifest is missing"]

    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return []

    errors: list[str] = []
    scripts = package.get("scripts", {})
    for name in ("dev", "build", "start", "lint", "typecheck", "test"):
        if not scripts.get(name):
            errors.append(f"package.json: missing {name} script")

    dependencies = package.get("dependencies", {})
    for name in ("next", "react", "react-dom"):
        if name not in dependencies:
            errors.append(f"package.json: missing runtime dependency {name}")

    compiler_options = json.loads((ROOT / "tsconfig.json").read_text(encoding="utf-8")).get("compilerOptions", {})
    if compiler_options.get("strict") is not True:
        errors.append("tsconfig.json: strict TypeScript mode must be enabled")

    return errors


def validate_required_files(paths: tuple[str, ...], label: str) -> list[str]:
    return [
        f"{relative_path}: required {label} file is missing"
        for relative_path in paths
        if not (ROOT / relative_path).is_file()
    ]


def validate_action_pins() -> list[str]:
    errors: list[str] = []
    workflow_root = ROOT / WORKFLOW_DIR
    if not workflow_root.exists():
        return errors

    workflow_files = (*workflow_root.rglob("*.yml"), *workflow_root.rglob("*.yaml"))
    for path in sorted(workflow_files):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read workflow ({exc})")
            continue

        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped.startswith("uses:"):
                continue

            reference = stripped.split(":", 1)[1].split("#", 1)[0].strip().strip("'\\\"")
            if reference.startswith(("./", "docker://")):
                continue

            revision = reference.rsplit("@", 1)[-1] if "@" in reference else ""
            if not ACTION_REFERENCE.fullmatch(revision):
                errors.append(
                    f"{path.relative_to(ROOT)}:{line_number}: "
                    f"action is not pinned to a full SHA: {reference}"
                )

    return errors


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

            candidate = (path.parent / unquote(local_target)).resolve()
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
    errors.extend(validate_package())
    errors.extend(validate_required_files(REQUIRED_DOCS, "documentation"))
    errors.extend(validate_required_files(REQUIRED_APP_FILES, "application"))
    errors.extend(validate_action_pins())
    errors.extend(validate_markdown_links())

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("Repository configuration, documentation and app scaffold checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
