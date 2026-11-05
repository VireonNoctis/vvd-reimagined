# Project Name

> Replace this sentence with a clear, one-line description of what this project does.

A clean, language-neutral foundation for building and maintaining software projects. It gives every new repository a consistent development environment, sensible defaults, quality checks, and security hygiene without choosing your architecture or dependencies for you.

## Start here

1. Rename the project and rewrite this README so it describes the actual product.
2. Read [the project setup checklist](docs/PROJECT_SETUP.md).
3. Choose the language, runtime versions, package manager, and application structure.
4. Add the real build, test, lint, and formatting commands to the CI workflow.
5. Choose and add a license before publishing or distributing the project.
6. Remove anything that does not belong in this project.

## Development environment

**GitHub Codespaces** is ready to use through `.devcontainer/devcontainer.json`. The workspace uses the Dev Containers Universal image so you can start with a broad set of common development tools, then add only the runtime-specific tooling your project needs.

For local development, use your preferred editor. The repository includes:

- `.editorconfig` and `.gitattributes` for consistent files.
- `.vscode/` recommendations and shared workspace settings.
- `.pre-commit-config.yaml` for common hygiene checks.
- `AGENTS.md` with guidance for coding agents and contributors.

## Quality and automation

| Tooling | Purpose |
| --- | --- |
| GitHub Actions | Validates the starter configuration on pushes and pull requests. |
| OpenSSF Scorecard | Periodically evaluates repository security practices. |
| Dependabot | Keeps GitHub Actions dependencies up to date. |
| Pre-commit | Catches whitespace, malformed config, merge markers, and private-key mistakes before commits. |
| `scripts/validate.py` | Checks the template's own JSON configuration and pinned workflow actions. |

These checks are a baseline, not a substitute for project tests. Add your language's formatter, linter, type checker, unit tests, integration tests, and build to `.github/workflows/ci.yml` once the stack is chosen. Keep required checks fast, deterministic, and reproducible.

### Run the baseline checks

```bash
python3 scripts/validate.py
```

Install the optional local Git hooks:

```bash
python3 -m pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## Repository map

```text
.
├── .devcontainer/       Codespaces and Dev Container setup
├── .github/             CI, security automation, issue and PR templates
├── .vscode/             Shared editor settings and recommendations
├── docs/                Setup notes, architecture, and decision records
├── scripts/             Small, dependency-free developer utilities
├── AGENTS.md            Guidance for coding agents
├── CONTRIBUTING.md      Contribution workflow
├── SECURITY.md          Vulnerability reporting guidance
└── README.md            Project entry point
```

## Engineering principles

- Prefer the smallest complete solution over unnecessary abstraction.
- Keep dependencies intentional and explain non-obvious choices.
- Make changes reviewable; avoid unrelated formatting or churn.
- Treat errors, permissions, input validation, and secrets as first-class concerns.
- Document real decisions and trade-offs, not speculative architecture.
- Never claim a test, build, or security check passed unless it was actually run.

## Security

Do not commit credentials, private keys, tokens, production data, or local environment files. Keep secrets in the relevant deployment platform's secret manager. See [SECURITY.md](SECURITY.md) for reporting guidance and [the setup checklist](docs/PROJECT_SETUP.md) for recommended repository settings.

## License

No license is included intentionally. Choose the license that matches this project's ownership and distribution model, then add the complete license text and update this section. Until a license is added, do not assume others have permission to reuse or distribute the project.
