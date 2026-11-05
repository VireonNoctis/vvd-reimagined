# Engineering Instructions

These instructions apply across this repository. More specific instructions in a nested `AGENTS.md` may refine them for that directory.

## Before changing code

1. Inspect the existing implementation, project structure, relevant documentation, and tests.
2. Identify the actual cause or requirement before editing.
3. Check whether an existing helper, dependency, or pattern already solves the problem.
4. Keep the proposed change proportional to the task.

## Implementation standards

- Prefer simple, explicit, maintainable code over clever abstractions.
- Make the smallest complete change. Do not refactor unrelated areas.
- Preserve existing public interfaces and data formats unless the task requires a change.
- Avoid adding dependencies when the standard library or existing tooling is sufficient.
- Validate inputs at boundaries and handle failure paths deliberately.
- Keep secrets, credentials, personal data, and production data out of source control and logs.
- Do not add placeholder implementations, fake data, silent fallbacks, or success messages for unfinished behavior.
- Follow the language, formatting, naming, and architecture conventions already used by the project.

## Verification

- Run the narrowest relevant tests first, then broader checks when practical.
- Run the project's formatter, linter, type checker, and tests when they exist.
- Add or update tests when behavior changes.
- Review the final diff for unintended files, generated artifacts, secrets, and unrelated edits.
- State exactly which checks were run and which were not. Never report an unexecuted check as passing.

## Documentation

Update documentation when setup, configuration, public behavior, architecture, or operational procedures change. Record significant architectural decisions in `docs/DECISIONS/`.

## Git hygiene

- Keep commits focused and messages descriptive.
- Do not rewrite shared history or force-push unless explicitly requested.
- Do not commit generated output, local IDE state, or environment-specific files without a project-specific reason.
