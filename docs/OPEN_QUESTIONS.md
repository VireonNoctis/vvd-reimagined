# Open Questions and Verification Register

This is the active list of product and implementation unknowns. Close an item only when a current first-party source or direct app observation answers it.

## Authenticated workspace

- [ ] What are the current beta routes and app shell regions?
- [ ] Does the beta retain the older tabs/sidebar model?
- [ ] What controls are available in the world switcher, home and World Info?
- [ ] What keyboard shortcuts are shown and configurable?
- [ ] What are the default panel widths and resize constraints?
- [ ] Which pointer context menus have touch/long-press equivalents?

## Documents and world data

- [ ] What document types are currently built in?
- [ ] What is the complete current card field/type/template editor?
- [ ] Are nested folders depth-limited?
- [ ] What are duplicate name and slug collision rules?
- [ ] How is an ambiguous name/alias resolved to a card?
- [ ] Can documents move between worlds or eras?
- [ ] What happens to references when a target is archived or permanently deleted?
- [ ] What are the exact world export/import formats?
- [ ] How are era overrides created, merged and restored?
- [ ] What content state is included in an immutable save?

## Graph, Maps, Trees, Canvas and Timeline

- [ ] Which graph layout, filters and node controls are current?
- [ ] Does the graph support manually authored edges?
- [ ] What coordinate system stores map overlays?
- [ ] How are overlays transformed if the map background aspect ratio changes?
- [ ] What calendar systems and date precision are supported now?
- [ ] Can timeline events reference cards?
- [ ] What canvas object types, snapping, grouping and multi-select exist?
- [ ] How are Relation Tree variants stored and compared?
- [ ] Are custom relationship types now saved, despite the older help article's caveat?

## Quill

- [ ] What editor engine and rich-text schema are used?
- [ ] Can two people edit the same chapter/draft concurrently?
- [ ] Can drafts be renamed, duplicated, compared or merged?
- [ ] Is a draft a branch, snapshot or independent document?
- [ ] How are note anchors remapped after edits?
- [ ] Which fonts, backgrounds and page layouts are available?
- [ ] Which audio file types and limits are supported?
- [ ] How are paragraph audio tracks stored and played?
- [ ] Do exports retain images, headings, annotations and styling?
- [ ] Can a chapter be unpublished or replaced after publication?
- [ ] How do published card references behave after the source card changes?

## Collaboration and reliability

- [ ] What exact offline persistence/sync protocol is used?
- [ ] Is collaboration scoped per document, project or world per feature?
- [ ] What happens when two conflicting typed operations target one scalar field?
- [ ] What is revision retention?
- [ ] What are backup/restore guarantees?
- [ ] Do all editor surfaces expose presence cursors and carets?

## Workshop and extensions

- [ ] What is the current built-in tool list and version matrix?
- [ ] Which tools are plan-gated?
- [ ] What does the latest manifest schema allow?
- [ ] How are update notices and pinned versions surfaced?
- [ ] Can projects be exported or transferred?
- [ ] What does human review require before public Workshop publication?

## Publishing, plans and account

- [ ] What is the current plan matrix by region and purchase channel?
- [ ] What happens to published sites after downgrade or pause?
- [ ] How are custom domains verified and SSL provisioned?
- [ ] Are entitled readers granted access by account id, email or both?
- [ ] What is the current payment processor, tax treatment and receipt format?
- [ ] Which sign-in methods are available?
- [ ] What are account export, deletion and data retention rules?

## Device and visual fidelity

- [ ] What phone-browser editing is officially supported?
- [ ] Are iPad and Android apps native wrappers or separate client shells?
- [ ] How do stylus and touch work in drawing versus selection mode?
- [ ] What are actual breakpoints, fonts, spacing and colour tokens?
- [ ] Which transitions, loading states and skeletons appear in the beta?

## Best next evidence

Use a synthetic world and capture redacted screenshots or recordings of:
- Home, navigation and settings.
- Full card editor, type manager and property editor.
- Maps, graph, tree, canvas and timeline.
- Quill writing, drafts, notes, focus mode and publish.
- Wiki editor and public reader.
- Collaboration roles, archive, revision restore and account plan.
- The same workflows at desktop and tablet dimensions.

Screenshots confirm visual state. Short recordings are better for drag, menus and transitions. No account password, API key or private writing is needed.


## Instagram-led product leads

- [ ] Inspect Trade Routes in the signed-in app: settlement creation, resource definitions, road/river route editing, simulation controls, outputs and persistence. The public listing calls it a core vvd tool, but its page has no detailed description.
- [ ] Capture the Overworld Wiki template in both live editing and published modes, including map regions, pins, cloud animation, the design rail and mobile behaviour.
- [ ] Inspect the community Calendar tool: calendar schema, year/month rules, holidays, lunar cycles, event linking, date conversion and whether it remains maintained.
- [ ] Determine whether the showcased 3D maps are made with the 3D Model Viewer, a separate Workshop creation or an external authoring workflow.
- [ ] Verify whether creator link-in-bio pages are an active vvd surface, the URL shape, profile fields, link/shop capabilities and relation to account identity or Wiki.
- [ ] Profile long Wiki pages and animated map/3D surfaces. A public comment alleges CPU/GPU pressure and memory growth on longer Wiki content; this is unverified anecdotal feedback, not a confirmed defect.
- [ ] Confirm current AI-assisted processing and privacy language. A user comment asking whether the product is AI-free is not an official statement; current Terms mention automated semantic categorisation/tagging of media but do not establish generative writing or training on world content.
