# Feature Inventory

This is the working inventory of product capabilities found in vvd's public material. A described feature is not automatically implemented here.

Evidence labels: **A** current developer docs; **B** product/store listing; **C** help-centre workflow; **T** official tutorial caption track; **S** official social/changelog/Reddit team post; **U** community user report; **D** reconstruction proposal.

## Current implementation

- PostgreSQL-backed world/account foundation, membership checks and version-checked card operations.
- Responsive workspace shell, searchable document library, details inspector, nested folders and folder moves.
- Canonical cards with aliases, typed scalar/reference properties, ordered text blocks and versioned Character/Place/Faction templates.
- Private Gallery foundation with signed S3-compatible transfers and server-side media validation.
- Named eras with sparse inheritance and personal graph layouts.
- WebGL World Graph with typed-reference and inferred-mention edges, filters and evidence excerpts.
- Persisted Map, Relation Tree, Canvas and Timeline documents with same-world reference validation and optimistic saves.
- Rust/Axum API, PostgreSQL migrations, authentication hardening and CI checks.

## Tutorial-verified product scope

The official ten-video [vvd tutorial series](YOUTUBE_TUTORIAL_RESEARCH.md) was analysed through manual English caption tracks on 2026-11-10. It verifies spoken workflows for world creation, Home/World/Wiki/Quill navigation, card taxonomy and organisation, Maps, World Graph, Wiki publishing, Canvas, Relation Trees and Quill.

## Social/changelog-verified additions

The [social/community dossier](SOCIAL_MEDIA_AND_COMMUNITY_RESEARCH.md) adds first-party public evidence for vvd3 and later releases:

- vvd3 rebuild, multi-tab workspace, configurable Home/New Tab search, world-owned URL identity, downloadable Windows/Mac/iPad/Android-tablet apps.
- Tools catalogue/library, user-created Workshop tools with moderation, 3D model viewer, tables, radar charts, embeds, notes and campaign-specific tools.
- Multiple Wikis per world at higher tiers, independent visibility/layouts, manual/type grouping, publishing tool documents, Traditional/Shell/Terminal layouts.
- Map Maker beta: 2D/3D terrain, biome/land/river/road authoring, map scaling, travel-time calculation and image-to-3D generation.
- Dictionary for constructed languages/alphabets with meanings and pronunciation guides.
- Quill book styling, audio/voice memo transcription, media embeds, print-like PDF/EPUB/Word export, free first-chapter trial.
- In-world comments, collaborator mentions, invited non-account seats, role-based Paths, Timeline event lanes and multi-card event links.
- Accessibility text scaling, OpenDyslexic option, reduced-transparency/performance mode and incremental phone layout support.
- Announced Trade Routes simulation; release not confirmed in the sources reviewed.

## Confirmed gaps against tutorials and social evidence

- **Workspace:** no full Home/World/Wiki/Quill tab shell, configurable Home dashboard, pinned/duplicated/renamed tabs, world-owned URL routes or New Tab global search.
- **Card taxonomy:** templates support Character/Place/Faction only. Creator-defined types/subtypes, genre defaults and rich block templates are not implemented.
- **Sidebar:** search and nested folders exist. Pinned/enlarged cards, filtering/sorting, manual order, folder icons and card-to-card parent/child organisation remain open.
- **Maps:** persisted first pass has backgrounds, layers, regions, linked pins and drag/vertex editing. Map Maker terrain generation, biome painting, image-to-3D, travel simulation, template library, visual-only styled pins, region fills and text overlays remain open.
- **World Graph:** filters and personal layouts exist. Search/highlighting, label visibility, isolated-node filtering, node sizing, force parameters and persistent node pins remain open.
- **Relation Trees:** nodes, typed edges and position variants exist. Relationship-type presets, endpoint reconnection, solid/dashed/dotted styles, line junctions, custom icons and annotations remain gaps.
- **Canvas:** object/group/drawing foundations exist. Page presets, complete shape authoring, embedded Map/Graph objects, draggable notes and all import paths remain open.
- **Wiki:** no working Wiki editor/reader yet. Multiple independent Wikis, visibility modes, manual/type grouping, themes, fonts, search, Shell/Terminal layouts, custom domains and synced direct editing remain open.
- **Quill:** not implemented. Story/cover, chapters/drafts, rich-text editor, context panel, prose-to-card linking, notes/effects, audio, reader previews, formatted exports and publication remain open.
- **Tool ecosystem:** no Explore/Library/Workshop model, extension sandbox, tool submission review pipeline, tool manifests or server-enforced tool permission system.
- **Dictionary/Campaigns/Trade Routes:** not implemented as complete connected tools.
- **Trust:** revision history and archive exist, but full user-controlled world export/import, portable schema/assets, documented backup/restore and service-continuity process remain open.
- **Collaboration:** comments, mentions, invitations, role permissions, presence and offline conflict resolution are not implemented as a complete collaboration system.
- **Accessibility/mobile:** phone-safe menus, single-document phone tabs, text scaling, dyslexia font option and performance/reduced-transparency mode remain open.

## User-reported friction to account for

These are individual reports, not proof of universal defects:

- Map editing: undo/redo discoverability, lake removal and Canvas cover-image editing were requested.
- Auto-linking: users asked how to disable automatic card linking; team points to a World Settings toggle.
- Migration: an Obsidian user asked about backup, data loss, exports/imports and shutdown continuity; team replied that backups run every few minutes and that export/import were being reworked. Treat this as a team statement, not independent verification.
- Offline/mobile: users requested offline and mobile/tablet workflows; team said full offline access was unlikely soon and mobile app support was still being investigated. Changelog separately describes locally retained offline edits, which is not equivalent to full offline parity.
- Earlier reported bugs included Firefox reconnect loops, missing Graph connections, unexpected logouts, Guided Template issues and Canvas lag/freezing; later vvd3 release notes acknowledge regressions during the rebuild.

The videos, social posts and team replies provide product behaviour and public statements, not private implementation details or independent verification of infrastructure/security claims.
