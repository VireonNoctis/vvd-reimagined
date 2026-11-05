# Instagram Research — @vvdworldbuilding

- Research date: 2026-11-05
- Account: https://www.instagram.com/vvdworldbuilding/
- Identity check: the account is linked from vvd's official Linktree.
- Access: public captions and profile snippets only. Direct Instagram page requests were throttled during this research pass.

## Why this page exists

Instagram is useful here because vvd uses short product demonstrations to expose capabilities that are not yet described in the developer docs. Those posts are evidence of product direction and public-facing behaviour, but a promotional Reel is not a full interaction specification. This document separates what the post says, what another first-party source confirms, and what still needs hands-on inspection.

## Source quality and limits

The official Linktree at https://linktr.ee/vvd.world links to the Instagram handle above. That is the basis for treating @vvdworldbuilding as vvd's official account.

The Instagram site itself throttled direct requests. Captions and post previews were therefore cross-checked through:
- Pictame profile mirror: https://pictame.com/en/instagram/vvdworldbuilding
- Pictame Reels/hashtag preview: https://pictame.com/en/discover/hashtag/whorblox-custom-maps
- Imginn mirror of the Trade Routes post: https://imginn.com/p/DdFMxPpJZbM/
- Imginn mirror of the February 2026 product introduction: https://imginn.com/p/DUTvsfaiahe/

Pictame and Imginn are third-party services and explicitly are not Instagram. Their post text is useful for discovery, but their profile analytics, counts, timestamps and engagement estimates are not authoritative. This dossier does not copy their follower/view statistics. The direct Instagram profile and official Linktree should be preferred when available.

## Profile positioning

The public profile bio describes vvd as a worldbuilding toolkit for storytellers, a fiction-writing platform and a home for large creative ideas. The account's product language repeatedly addresses authors, webtoon creators, tabletop role-playing creators, indie writers and broader storytellers—not only fantasy novelists.

The February 3, 2026 post describes the core flow as:
- Organise a world's lore.
- Place interactive pins on custom maps.
- Collaborate with other creators.
- Share a custom wiki with fans or followers.

That is consistent with the current product site's four central jobs: organise a world, create interactive maps, visualise connections, publish a custom wiki and collaborate in real time.

## Product demonstrations and announcements

### 1. Trade Routes — promoted as an economy and logistics simulator

The September 9, 2026 post says vvd was developing a Trade Routes tool. The caption describes a creator being able to:
- Build the economy behind a fictional story.
- Assign resources to settlements.
- Draw roads and rivers connecting those settlements.
- Simulate the movement of supplies across the map.

This was presented as an in-development feature in the social post. The current first-party tool page now lists **Trade Routes** as a core vvd tool, with a Use action, version 0.1.50 and a recent update. The page itself currently has no detailed description, so the Instagram caption remains the best public explanation of the intended workflow.

**Research conclusion:** Trade Routes is no longer just a social concept; a first-party core tool listing exists. Its detailed mechanics remain undocumented.

**Implementation implications (proposed, not reverse-engineered):**
- Treat settlements and route segments as identifiable objects, not painted pixels.
- Model route connections separately from the map's visual background.
- Keep the map geometry and economy/simulation state distinct so editing a road does not corrupt resource records.
- A useful simulation will likely need resource types, settlement inventories, route connectivity and a time/flow model; the exact inputs, constraints and outputs must be captured before fixing the schema.
- Do not infer that every route is a river/road, that routes have capacity limits, or that the system computes shortest paths; none of those mechanics are stated in the post.

Current first-party listing: https://vvd.world/t/trade-routes

### 2. Overworld — map-first Wiki template

An Instagram Reel announces **The Overworld**, a wiki template intended to make the map the centre of a world's published site. The caption highlights:
- Interactive regions and pins.
- A cleaner interface.
- Animated cloud layers.
- A map-led presentation rather than a conventional list-first wiki.

The current developer reference independently confirms that vvd ships two first-party site templates, Default and Overworld. A site-category app appears in the shared Wiki surface; the user switches templates in the Wiki design rail rather than opening a separate app tile. The platform provides the Customize rail and Publish action. The template author supplies the page layout and theme parameters.

**Research conclusion:** Overworld is a real first-party Wiki template, not just a mock-up. The social post contributes visual direction—map-first hierarchy and animated atmospheric layers—that the developer reference does not spell out in full.

**Implementation implications:**
- Keep the public Wiki as an app over canonical world documents.
- Treat the map as a first-class landing-page region, with selectable map regions and pins that navigate to the related canonical entries.
- Make the map-focused layout a template choice, not a separate duplicate Wiki product.
- Keep clouds and other atmospheric effects decorative and independently switchable; they must not block map hit-testing or reduce text/map accessibility.
- Distinguish the live editable Wiki from its published frozen edition.

Current reference: https://docs.vvd.world/workshop/reference/wiki

### 3. 3D maps, historical timelines and Quill side by side

A profile post presents a creator's fantasy-world workflow as a combination of 3D maps, historical timelines and novels written alongside worldbuilding. This is important as a product-level showcase: vvd wants users to see visual geography, chronology and prose as parts of one creative process.

It does **not** prove that vvd includes a first-party 3D cartography editor. The first-party 3D Model Viewer page describes viewing 3D characters, environments and items from every angle. That is a separate, documented tool.

**Research conclusion:** keep the following capabilities distinct:
- 2D Maps: background image plus pins, regions and labels.
- 3D Model Viewer: inspect individual 3D assets.
- Any 3D map/world scene shown in creator content: a showcased result whose production toolchain is not established by the caption.
- Timeline and Quill: existing world chronology and novel-writing surfaces.

Do not merge these into one WebGL canvas until actual app behaviour demonstrates that they share a scene model.

First-party references:
- https://vvd.world/t/3d-model-viewer
- https://vvd.world/t/maps
- https://vvd.world/t/timeline

### 4. Custom fictional calendars — community Workshop tool

An Instagram post demonstrates a calendar for fictional worlds. The caption describes tracking:
- Events and holidays.
- Lunar cycles.
- A visual style customised to the world's theme.

The first-party tool page at https://vvd.world/t/calendar identifies the creator as HHaseeb rather than vvd and currently has no detailed description. This is evidence of a community-created Workshop tool, not evidence that a native Calendar app is part of the core product.

The main product site also highlights Calendar in its example-tool area, which makes it a useful ecosystem example.

**Research conclusion:** support extensible calendar tools and custom calendar data through the tool/codec model. Do not classify the Instagram calendar as a built-in feature or copy its undocumented internals.

**Implementation implications (proposed):**
- The tool may need custom month/day names, year lengths, leap rules, holidays and one or more lunar-cycle definitions.
- Timeline events should remain canonical world content or typed references, not be trapped inside a calendar renderer.
- Calendar presentation and date arithmetic should be separate: a calendar can render an event date without owning the event itself.
- Verify whether the tool supports multiple moons, irregular cycles, recurring events or conversion between calendars before implementing them.

### 5. Map-centred author websites

A profile post showcases an author's website built around a custom illustrated map, with interactive regions and pins. This is a concrete use case for vvd's Wiki publishing: the world becomes a reader-facing site, and geography can be the main navigation surface rather than just an image embedded in an article.

The exact website shown is a published creator example, not a specification for the built-in Overworld template. Keep the distinction between a custom site layout and the first-party template.

### 6. Creator link-in-bio pages

A newer profile preview announces a link-in-bio surface for worldbuilders, writers, artists and studios. The caption describes using it to share a portfolio, shop, products and other external links, with a customisable profile.

This appears adjacent to worldbuilding and Wiki publishing rather than part of the core world editor. No current route, official developer reference or detailed public data model was found in this research pass.

**Status:** Instagram-announced capability; exact current availability and implementation are unverified.

Do not silently fold this into the Wiki model. It may be a separate creator profile/microsite surface with its own link list, theme and public URL. Confirm whether it is still offered, whether it is a standalone product or a Wiki template, and how it relates to account identity.

## Editorial, community and creator ecosystem

The profile is not exclusively a product changelog. Its recent public posts also include:
- Storytelling education and editorial content, including meta-fantasy and environmental storytelling.
- A discussion of how the environment can shape a story, using *Scavengers Reign* as an example.
- Articles and posts advocating for human creativity and storytelling.
- Creator and indie-studio spotlights.
- Attendance/community announcements such as PAX Unplugged.
- The vvd Fellowship.

These posts describe the brand and community surrounding the product. They should inform the tone and ecosystem positioning, but they are not app requirements by themselves.

### vvd Fellowship

The official page at https://vvd.world/fellowship describes up to a $5,000 grant, marketing support and access to a network, with no equity and no application cost. Instagram's announcement positions the programme as support for ambitious fiction and creative projects. This is an adjacent creator-support programme, not a subscription entitlement or a feature of the world editor.

## User feedback visible in post comments

A comment on the Trade Routes announcement raised concerns about browser CPU/GPU usage and alleged memory growth while using long Wiki content. This is a single public user report surfaced by a third-party mirror; it is **not a confirmed defect** and the wording does not establish a reproducible failure.

It is nevertheless a useful test lead:
- Profile long Wiki pages with many paragraphs and embedded content.
- Check that editor state, listeners, observers, media and collaboration subscriptions are cleaned up when switching documents.
- Benchmark graph/map/canvas and any 3D surfaces independently.
- Keep Three.js lazy and do not load WebGL scenes on ordinary Wiki pages.
- Test a published Wiki separately from the live editor because the published host has different capabilities.

A February post also contains a user asking whether AI is central to the website. That question is not an official answer and must not be treated as evidence that vvd is either AI-free or AI-first. Current terms mention automated semantic systems for analysing, categorising and tagging media; they do not, by themselves, establish generative writing or training on user worlds. Keep the product's AI/privacy stance as a separate verification question.

## Product-level takeaways

1. **Worldbuilding is shown as a connected workflow.** Maps, timelines, Quill and lore are demonstrated together rather than as disconnected features.
2. **The Wiki is a publication surface with templates.** Overworld makes geography a main navigation structure.
3. **The Workshop ecosystem matters.** Trade Routes is a core tool; Calendar is a community-created tool. Their different ownership must remain visible in the inventory.
4. **The map is becoming more than a static attachment.** It can act as the starting point for published exploration and route simulation.
5. **Visual richness has a performance cost.** Animated clouds, interactive regions, route simulations and 3D showcases should be measured and loaded deliberately.
6. **Creator profile/link pages may be a separate product surface.** Verify them before adding them to the core domain model.
7. **The brand includes editorial and creator support.** These are ecosystem features, not necessarily app routes.

## Verification still required

- Capture the Overworld template in a current authenticated Wiki editor and its published output.
- Inspect the current Trade Routes tool: object creation, route editing, resource assignment, simulation controls, output and persistence.
- Open the Calendar tool and verify its actual fields and date model.
- Inspect the creator link-in-bio surface and determine whether it is current, separate from Wiki, and account-linked.
- Confirm whether showcased 3D maps are produced by the built-in 3D Model Viewer, a community tool or an external creation workflow.
- Profile long Wiki pages and map/graph/3D surfaces for memory and GPU use.
- Confirm the current AI/media-processing policy from up-to-date first-party privacy materials.

## Source register

### Official identity and social account
- Official Linktree, which links the Instagram account: https://linktr.ee/vvd.world
- Official Instagram: https://www.instagram.com/vvdworldbuilding/

### Instagram post mirrors (third-party, used only because direct Instagram access was throttled)
- Profile post index and bio: https://pictame.com/en/instagram/vvdworldbuilding
- Product messaging Reel preview: https://pictame.com/en/discover/hashtag/whorblox-custom-maps
- Trade Routes announcement and visible comments: https://imginn.com/p/DdFMxPpJZbM/
- February 2026 product introduction and visible comments: https://imginn.com/p/DUTvsfaiahe/

### First-party product and developer sources
- Trade Routes: https://vvd.world/t/trade-routes
- Calendar: https://vvd.world/t/calendar
- 3D Model Viewer: https://vvd.world/t/3d-model-viewer
- Maps: https://vvd.world/t/maps
- Timeline: https://vvd.world/t/timeline
- Wiki runtime reference: https://docs.vvd.world/workshop/reference/wiki
- Wiki build guide: https://docs.vvd.world/workshop/wiki/build-a-themed-wiki
- Product site: https://vvd.world/
- Fellowship: https://vvd.world/fellowship
