# Contributing

This is a research-led product reconstruction. Contributions should improve product accuracy, user workflows or maintainability without presenting assumptions as observed facts.

## Before changing a feature

1. Read the relevant entry in docs/FEATURE_INVENTORY.md.
2. Check its evidence status and source in docs/RESEARCH.md.
3. Check the domain constraints in docs/PRODUCT_MODEL.md.
4. Check unresolved behaviour in docs/OPEN_QUESTIONS.md.
5. Describe the user workflow before selecting components or data structures.

For major changes to the domain model, permissions, collaboration or publication, add or update an ADR.

## Development workflow

1. Work from the current default branch.
2. Keep changes scoped to one coherent workflow.
3. Update tests and documentation with behaviour changes.
4. Run the relevant checks and report their exact results.
5. Review the complete diff for data-loss risks, unverified claims and unnecessary abstraction.

## Current validation

At this stage, only repository configuration validation exists:

~~~sh
python3 scripts/validate.py
~~~

There is no application package or backend yet. Do not invent build/test commands. Add real commands to this file and CI once the first runnable application slice exists.

## Pull requests

- Explain the user problem and the behaviour changed.
- Identify the relevant feature inventory entries.
- Call out canonical data, migration, permission and collaboration changes.
- Include screenshots or recordings for visual changes using synthetic content.
- List exact checks performed and limitations.
- Do not include private vvd content, unpublished writing, credentials or copied copyrighted assets.
