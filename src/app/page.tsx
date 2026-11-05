import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { demoWorld } from "@/data/demo-world";

export default function WorldsPage() {
  const updated = new Date(demoWorld.updatedAt + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short" });

  return <main className="worlds-page">
    <header className="worlds-topbar">
      <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
      <div className="worlds-topbar-right"><span className="preview-pill dark-preview"><span /> Preview environment</span><span className="profile-chip">V</span></div>
    </header>
    <section className="worlds-content">
      <div className="worlds-intro"><div className="eyebrow">YOUR CREATIVE SPACE</div><h1>Worlds, in progress.</h1><p>A connected home for the places, people and stories you are building.</p></div>
      <div className="worlds-section-heading">
        <div><span className="eyebrow">LIBRARY</span><h2>Your worlds <span>01</span></h2></div>
        <button className="toolbar-button create-world-button" type="button" disabled title="World creation is not connected to persistence"><Icon name="plus" size={15} />New world</button>
      </div>
      <Link className="world-card" href={"/worlds/" + demoWorld.slug}>
        <div className="world-card-art"><div className="art-sun" /><div className="art-horizon" /><div className="art-mountain art-mountain-back" /><div className="art-mountain art-mountain-front" /><div className="art-water" /><span className="art-caption">WORLD NO. 001</span><span className="art-coordinate">41° 08′ N / 08° 36′ W</span></div>
        <div className="world-card-body">
          <div className="world-card-title"><div><span className="eyebrow">{demoWorld.genre}</span><h3>{demoWorld.name}</h3></div><span className="world-card-arrow"><Icon name="chevron-right" size={18} /></span></div>
          <p>{demoWorld.description}</p>
          <div className="world-card-footer"><span><Icon name="files" size={14} />{demoWorld.documents.length} records</span><span>Updated {updated}</span></div>
        </div>
      </Link>
      <div className="worlds-footnote"><Icon name="spark" size={15} /><span>This is a read-only preview populated with synthetic content. Nothing is saved to a server.</span></div>
    </section>
    <footer className="worlds-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
  </main>;
}