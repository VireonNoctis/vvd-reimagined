# Quill — Writing Product Specification

Quill is vvd's story-writing app. Its strongest product quality is that writing is connected to the same world data used elsewhere: cards, maps, notes and other records can be opened as context without maintaining a second lore database.

Evidence comes from the official Quill help pages and current developer docs. Several detailed support pages are marked as works in progress.

## Story structure

The help centre describes:
- A story/book with a cover image.
- An ordered chapter list.
- Multiple drafts per chapter.
- Chapter rename and reorder actions.
- Opening another chapter in a side-by-side panel.
- A story header showing chapter count and total word count.
- Per-chapter word and page counts in Publish Mode.

The current docs use a project/app model; the Quill story is best modelled as an app project with chapter and draft content. The public materials do not fully explain draft naming, comparison, branch/merge or active-draft persistence.

## Writing workspace

The documented layout has three primary regions:
1. Chapter list on the left.
2. Writing surface in the centre.
3. Collapsible contextual side panel on the right.

The side panel has static quick-access items and configurable blocks. Described blocks include Focus Mode, Drafts, Notes, Styling, world documents, detected cards, a pinned Radio station and a selected Gallery image. Customisable blocks can be added, removed or resized. Selecting an item can open a dedicated side-panel tab.

Exact column widths, resize limits, keyboard shortcuts and panel persistence are unknown until current-app capture.

## World context and references

Writers can reference world material while writing. The help centre describes:
- Opening cards, maps, canvases, trees and graph in the side panel.
- Auto-linking card names and aliases.
- Manual linking by selecting text or using an at-sign lookup.
- Entity Detection for likely new entities.
- Editing or creating world material without losing the current writing context.

References should resolve to canonical document ids. They should not paste independent copies of a card's content into the chapter. The reader-facing presentation should make the reference target and publication version clear.

## Notes and annotations

Notes can be general or attached to a chapter. Selecting a passage and choosing Add Note creates a note associated with that chapter. Notes are accessible from the contextual panel.

The public help page does not explain the anchoring algorithm. A robust reconstruction should anchor annotations to stable text/block identity and maintain a best-effort mapping when text changes. If the anchor becomes ambiguous, show that state rather than attaching the note to unrelated text.

## Focus and styling

Focus Mode removes distractions from the writing experience. Quill inherits the world theme by default, while the author can change writing background colour and font from the side panel. A documented Google Docs-like mode keeps visible page borders.

The exact font list, colour palette, page widths and typography are not published in the help article. Capture them directly before treating them as parity requirements.

## Drafts, history and undo

The Quill overview says each draft has revision history and conventional undo is available with Ctrl/Cmd+Z. These are separate concepts:
- Undo/redo navigates recent editing operations.
- Revision history represents recoverable prior states of a draft.
- Draft switching changes the active body being edited.

Restore should be explicit and recoverable. A restore should preferably create a new revision instead of destroying the historical state being restored from.

## Audio Mode

The help centre describes an Audio Mode reached from the lower workspace menu. The author can select or upload audio and associate it with a paragraph or an entire chapter. The reader hears the corresponding audio as they move through the story.

Unknowns include accepted file types, size limits, transcoding, hosting, autoplay rules, playback controls, captions and export support. These must be verified before implementation claims.

## Publish Mode

Publish Mode switches from authoring to a reader-facing preview. The documented side panel changes to three sections:

- **Styling:** presentation of the public story.
- **Export:** downloadable file formats.
- **Publish:** share link and chapter-level publication controls.

### Exports

The support page lists:
- EPUB.
- PDF.
- Microsoft Word DOCX.

A reconstruction should preserve chapter order, core formatting and cover metadata where supported. The reference article does not provide a detailed compatibility matrix for every rich-text block, image, audio attachment or note.

### Chapter publication

Publish Mode is documented as showing published chapter status, share link, chapter word/page counts and estimated reading time. It allows the author to publish more chapters.

This suggests that chapter publication is more granular than a single book-level public/private toggle. The exact unpublish, replacement and reader URL semantics need direct inspection.

## Suggested domain model

This is a reconstruction proposal, not a claim about vvd's private schema.

| Entity | Responsibility |
| --- | --- |
| Story project | Title, cover, project identity, theme overrides and publication settings |
| Chapter | Stable identity, order, title and publication relationship |
| Draft | Named working version or branch for one chapter |
| Prose block | Rich text with stable block identity and collaborative state |
| Note | General note or anchor to a chapter/text range |
| World reference | Typed relation to a canonical world document |
| Audio attachment | Audio asset and playback scope: paragraph or chapter |
| Publication snapshot | Reader-visible content and style version |

## Acceptance criteria

- A user can create a story project and edit its cover.
- Chapters can be created, renamed, reordered and opened side by side.
- A chapter can have multiple drafts without one draft silently overwriting another.
- Chapter count and total word count remain accurate.
- Focus Mode reduces workspace chrome without hiding essential editing actions.
- Opening a world reference preserves the current chapter, scroll position and writing cursor.
- Mention and alias links resolve to the correct world document.
- General and chapter notes work; text annotations remain meaningfully anchored after nearby edits.
- Revision restore is explicit, recoverable and clearly scoped to the selected draft.
- Audio may be attached at paragraph or chapter scope.
- Publish preview is distinct from the editing surface.
- EPUB, PDF and DOCX exports preserve chapter order and basic structure.
- Publishing one chapter does not unintentionally publish every other chapter.
- Desktop and tablet writing layouts are tested independently.
