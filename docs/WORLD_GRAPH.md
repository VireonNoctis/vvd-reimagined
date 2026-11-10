# World Graph

The World Graph is a derived visual projection over the documents resolved for the selected era. It is not an editor, an independent relationship database or a substitute for Relation Tree.

## Edge types

Two edge types are currently projected:

- **Typed references** come from card properties whose value points at another canonical card.
- **Mentions** are derived from names and aliases found in card body text.

Mention matching is case-insensitive and uses whole-phrase boundaries. Longer phrases are considered before shorter overlapping phrases. A phrase is ignored if it is ambiguous because more than one card claims that name or alias. Self-mentions are ignored, and repeated mentions between the same pair are coalesced into one edge with an occurrence count.

The two edge types have different visual treatments and independent filters. Character, Place and Faction nodes can also be filtered independently. Selecting a mention relationship exposes source excerpts and the originating block id, so an inferred edge can be checked against the writing that produced it. Up to five excerpts are retained per relationship to keep the graph projection bounded; the full document remains the source of truth. Relation Tree relationships remain separate explicit data and are not inferred by the graph.

Because the server returns era-resolved documents, the graph automatically follows the selected era. It does not create copies of cards or save graph edges as canonical content.

## Personal saved layouts

A saved graph layout belongs to one account, one world and one era. It stores:

- The name and optimistic version.
- Normalised positions for canonical document ids.
- Pan/zoom viewport state.
- Active edge and entity filters.

The database foreign keys tie the layout to a current world membership and an era in that same world. Removing a user's world membership removes their personal layouts. Different users can save a layout with the same name; names only need to be unique within one user's world/era collection.

API operations:

- `GET /v1/worlds/{slug}/graph-layouts?eraId=...` lists the signed-in member's layouts for that era.
- `POST /v1/worlds/{slug}/graph-layouts` creates a personal layout.
- `PATCH /v1/worlds/{slug}/graph-layouts/{layoutId}` updates a layout using `expectedVersion`.
- `DELETE /v1/worlds/{slug}/graph-layouts/{layoutId}` deletes only the caller's layout.

Create and update operations validate finite canvas coordinates, viewport bounds, duplicate positions and document ids against the selected era. Layout writes are personal and do not require world-editor privileges, but the caller must still be a member of the world.

## Current boundaries

- Node positions are saved for canonical records only. There are no era-local documents in the current document model.
- The graph does not write edges back into cards. Mention links remain derived; typed references remain card properties.
- Saved positions are restored for current nodes. A card that was archived or is otherwise absent from the selected era is ignored when a layout is applied.
- Manual graph edges, saved graph sharing, layout import/export and automatic layout algorithms remain future work.
- Relation Tree has its own explicit graph model and must not reuse mention edges as authored relationships.
