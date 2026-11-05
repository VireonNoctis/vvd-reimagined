# Contributing

Thanks for taking the time to improve this project.

## Before opening a change

- Read the README and relevant architecture or setup documentation.
- Check existing issues and pull requests to avoid duplicate work.
- For substantial changes, describe the intended approach before implementing it.

## Development workflow

1. Create a focused branch from the default branch.
2. Make the smallest complete change that solves the problem.
3. Add or update tests for changed behavior.
4. Update documentation when setup, behavior, configuration, or public interfaces change.
5. Run the checks relevant to the code you touched.
6. Review the complete diff before opening a pull request.

## Baseline checks

Run the repository's dependency-free validation:

```bash
python3 scripts/validate.py
```

Optional local hooks:

```bash
python3 -m pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Project-specific build, test, lint, and format commands should be documented in the README and added to CI.

## Pull requests

- Explain the problem and the reason for the approach.
- Describe user-visible or operational impact.
- Include tests and validation performed, including anything not tested.
- Call out migration steps, configuration changes, and security implications.
- Keep each pull request focused and reasonably sized.

Be respectful and constructive in reviews. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
