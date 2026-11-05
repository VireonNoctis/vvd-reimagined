# 0001. Use Next.js with React and TypeScript

- Status: Accepted
- Date: 2026-11-05
- Owners: Project maintainers

## Context

The product needs authenticated workspace routes, public reader surfaces, multiple document editors and interactive client-side tools. The user explicitly selected Next.js as the frontend framework and clarified the React/TypeScript stack.

## Decision

Use Next.js as the web application framework, React as the component model and TypeScript as the application language. Start with the App Router unless implementation evidence identifies a concrete limitation.

Keep domain schemas and API contracts independent of React components. Use server rendering for suitable data-oriented composition and client components for editors, browser APIs, collaboration hooks and interactive visual tools.

## Alternatives

- Vite + React: viable for a client application, but would require assembling public reader/server route behaviour separately.
- Remix or another React framework: technically viable, but not the selected direction.
- A non-React framework: outside the chosen direction.

## Consequences

- One routing/rendering system can host public, authenticated and published-reader surfaces.
- React components can be reused between editor and tool surfaces.
- Client/server boundaries require care; rich editors and WebGL need client execution.
- Next.js does not replace TypeScript: Next.js is the framework, React is the UI library and TypeScript is the language.
