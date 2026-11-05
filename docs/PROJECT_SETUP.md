# Project Setup Checklist

Use this checklist when creating a project from the template. Delete or adapt sections that do not apply.

## Identity and ownership

- [ ] Set the repository and application name.
- [ ] Replace the template README with the product's purpose, features, screenshots or examples, and actual usage instructions.
- [ ] Add the maintainer or organization details.
- [ ] Choose a license deliberately and add the complete license text. This template does not choose one for you.
- [ ] Decide whether the project is public, private, or internal.

## Technology

- [ ] Choose supported language and runtime versions.
- [ ] Choose one package manager and commit its lockfile.
- [ ] Add the actual project structure and entry points.
- [ ] Document reproducible installation, development, build, and test commands.
- [ ] Add formatting, linting, type checking, and tests for the selected stack.
- [ ] Update `.devcontainer/devcontainer.json` with project-specific tools, services, ports, and extensions.
- [ ] Add any required environment variable names to `.env.example`, using safe sample values only.

## Continuous integration

- [ ] Extend `.github/workflows/ci.yml` with the real build and test commands.
- [ ] Test the workflow on a pull request before making it a required check.
- [ ] Keep third-party Actions pinned to full commit SHAs and let Dependabot propose updates.
- [ ] Add release, deployment, and artifact workflows only when the project needs them.

## Repository security and maintenance

- [ ] Enable Dependabot alerts and dependency updates.
- [ ] Enable secret scanning and push protection when available for the repository.
- [ ] Enable private vulnerability reporting.
- [ ] Review the OpenSSF Scorecard report and address relevant findings.
- [ ] Protect the default branch with a ruleset or branch protection policy.
- [ ] Require review and passing checks appropriate to the project's risk.
- [ ] Store deployment credentials in GitHub Actions or the target platform's secret manager.
- [ ] Review the permissions granted to every workflow and third-party Action.

## Remove template-only material

- [ ] Replace this checklist with project-specific onboarding instructions.
- [ ] Update `AGENTS.md` with real commands, architecture boundaries, and repository-specific constraints.
- [ ] Remove tools or community files that do not fit the project.
- [ ] Check links, examples, and badges after renaming the repository.
