import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { worldRepository } from "@/server/worlds/repository";
import { apiConfigured, requireAccount } from "@/server/api";

export default async function WorldsPage() {
  const account = await requireAccount();
  const worlds = await worldRepository.list();

  return (
    <main className="worlds-page">
      <header className="worlds-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
        <div className="worlds-topbar-right">
          {apiConfigured
            ? <span className="preview-pill"><span /> Connected workspace</span>
            : <span className="preview-pill dark-preview"><span /> Preview environment</span>}
          {account && <span className="profile-chip" title={account.displayName}>{account.displayName.slice(0, 1).toUpperCase()}</span>}
          {account && <Link className="account-link" href="/account/security">Security</Link>}
          {account && <SignOutButton />}
        </div>
      </header>

      <section className="worlds-content">
        <div className="worlds-intro">
          <div className="eyebrow">YOUR CREATIVE SPACE</div>
          <h1>Worlds, in progress.</h1>
          <p>A connected home for the places, people and stories you are building.</p>
        </div>

        <div className="worlds-section-heading">
          <div>
            <span className="eyebrow">LIBRARY</span>
            <h2>Your worlds <span>{String(worlds.length).padStart(2, "0")}</span></h2>
          </div>
          {apiConfigured
            ? <Link className="toolbar-button create-world-button" href="/worlds/new"><Icon name="plus" size={15} />New world</Link>
            : <button className="toolbar-button create-world-button" type="button" disabled title="Connect the API to create worlds"><Icon name="plus" size={15} />New world</button>}
        </div>

        {worlds.length ? (
          <div className="worlds-grid">
            {worlds.map((world, index) => {
              const updated = new Date(world.updatedAt + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short" });
              return (
                <Link className="world-card" href={"/worlds/" + world.slug} key={world.id}>
                  <div className="world-card-art">
                    <div className="art-sun" />
                    <div className="art-horizon" />
                    <div className="art-mountain art-mountain-back" />
                    <div className="art-mountain art-mountain-front" />
                    <div className="art-water" />
                    <span className="art-caption">WORLD NO. {String(index + 1).padStart(3, "0")}</span>
                    <span className="art-coordinate">CANONICAL WORLD</span>
                  </div>
                  <div className="world-card-body">
                    <div className="world-card-title">
                      <div><span className="eyebrow">{world.genre || "WORLD BUILDING"}</span><h3>{world.name}</h3></div>
                      <span className="world-card-arrow"><Icon name="chevron-right" size={18} /></span>
                    </div>
                    <p>{world.description || "A new world, ready for its first records."}</p>
                    <div className="world-card-footer">
                      <span><Icon name="files" size={14} />{world.documents.length} records</span>
                      <span>Updated {updated}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="worlds-empty">
            <span className="worlds-empty-mark"><Icon name="globe" size={22} /></span>
            <h2>Nothing here yet.</h2>
            <p>Your first world becomes the place where its cards, maps, timelines and stories connect.</p>
            <Link className="auth-submit" href="/worlds/new">Create your first world <span aria-hidden="true">↗</span></Link>
          </div>
        )}

        {!apiConfigured && (
          <div className="worlds-footnote"><Icon name="spark" size={15} /><span>This is a read-only preview populated with synthetic content. Configure the Rust API to use accounts and persistent worlds.</span></div>
        )}
      </section>
      <footer className="worlds-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
    </main>
  );
}
