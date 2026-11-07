import Link from "next/link";

export default function NotFound() {
  return <main className="not-found-page"><span className="eyebrow">404 · NO SUCH WORLD</span><h1>This page has drifted off the map.</h1><p>The world or document you are looking for is not part of this preview.</p><Link className="text-link" href="/">Return to worlds</Link></main>;
}