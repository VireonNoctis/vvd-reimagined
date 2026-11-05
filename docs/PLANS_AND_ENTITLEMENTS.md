# Plans and Entitlements

- Checked: 2026-11-05
- Primary source: https://www.vvd.world/pricing
- Important: account grandfathering, region, currency and in-app purchase channel can affect what a user actually sees.

This page records the current public pricing-page feature matrix. It is not a billing integration specification and should be rechecked before implementing plan enforcement or checkout.

## Public plan matrix

| Entitlement | Free | Hobbyist | Pro | Studio |
| --- | --- | --- | --- | --- |
| Price shown on current page | $0 | $69 billed yearly | $129 billed yearly | $350 billed yearly |
| Worlds | 1 | 2 | Unlimited | Everything in Pro |
| Documents | 20 | Unlimited | Unlimited | Everything in Pro |
| Media storage | 100 MB | 1 GB | Unlimited, fair use | Everything in Pro |
| Quill stories | 1 | 3 | Unlimited | Everything in Pro |
| Chapters per story | 1 | Unlimited | Unlimited | Everything in Pro |
| Tools | Basic tools | Full tools | Full tools | Full tools |
| Private share links | — | Yes | Yes | Yes |
| Invite-only publishing | — | Yes | Yes | Yes |
| Public publishing | — | — | Yes | Yes |
| Password-protected publishing | — | — | Yes | Yes |
| Custom domain | — | — | Yes | Yes |
| Collaborators | — | Not listed on page | 3 | 5, then $5.83/month each |
| Roles and permissions | — | — | — | Yes |
| Studio owns worlds | — | — | — | Yes |
| Admin panel and offboarding | — | — | — | Yes |
| External API | — | — | Yes | Yes |

The page currently advertises two months free on yearly billing. Monthly price text is visually extracted with broken character spacing, so this dossier records only the clear annual prices. Do not infer monthly prices from the extraction.

## FAQ details that affect implementation

The live pricing FAQ adds important behaviour:

- A subscription can be paused. During pause, the user is not charged but retains viewing access to worlds and can share content; creating is expected to resume after reactivation.
- Downgrading does not delete existing content. If the user exceeds the new plan's limits, the restriction is on creating new content until usage fits or the user upgrades.
- Existing subscribers keep their prior price and included features while the subscription remains active.
- A document count includes anything a tool makes, such as a card, map, timeline or page. Folders do not count.
- Workshop tools may be opened and tried on Free; content made by the tool is not saved on that plan.
- The public page says unlimited media is subject to a fair-use policy.

These details strongly suggest entitlements should govern operations rather than hiding or deleting existing content.

## Conflicting public material

The older Terms page (https://vvd.world/terms) still describes a different plan matrix: Free 1 world/20 cards/20 images; Hobbyist 3 worlds/unlimited cards/1GB; Pro unlimited worlds/cards/images with older monthly prices. That conflicts with the current pricing page, which says 20 documents, 2 Hobbyist worlds and adds Quill/publishing/collaborator/API distinctions.

The Apple and Google Play descriptions are not a stable canonical plan table either. Users may also have grandfathered plans. The pricing page itself says existing subscribers keep their previous price/features while they stay subscribed.

Do not copy the older terms numbers into the new app. For live implementation, the current pricing page is the best public baseline, but the signed-in account's entitlement response must be authoritative.

## Entitlement architecture for the rebuild

Store plan definitions centrally and version them. An entitlement decision should be made by a service, not by scattered UI checks.

Useful entitlement keys include:
- world.create
- document.create
- media.storage_bytes
- quill.story.create
- quill.chapter.create
- tools.use
- share.private_link
- publish.invite_only
- publish.public
- publish.password
- site.custom_domain
- collaboration.member_limit
- collaboration.roles
- studio.ownership
- studio.admin
- api.world_content

The service should return both permission and reason/limit. The UI can then explain why an action is unavailable and what the user can do next.

## Downgrade and pause invariants

1. Do not delete worlds or documents when a plan is paused or downgraded.
2. Existing content remains readable according to the current public FAQ.
3. Block or limit new creation when current usage exceeds the new plan.
4. Keep existing plan grants for grandfathered subscribers where required.
5. Distinguish "try a tool" from "save the content it creates".
6. Treat unlimited media as subject to fair use, not an infinite abuse guarantee.
7. Never trust a client-supplied plan name or usage total.
8. Verify plan status server-side before a restricted operation.

## Open billing questions

- What price/currency is shown in each region?
- How are annual renewals, pausing and reactivation handled?
- How are legacy/grandfathered subscriptions represented?
- Are in-app subscriptions managed by the store or web checkout?
- What happens to custom domains and public sites during downgrade?
- How are collaborator add-ons billed and prorated?
- What is the precise behaviour for content creation while paused?

No payment provider is confirmed for the reconstruction. The old Terms mention Stripe but are not enough to treat it as the current payment integration.
