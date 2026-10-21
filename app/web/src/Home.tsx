import { useState } from "react";
import { Button } from "@graphical";
import { recentDocs } from "./identity.ts";
import { Brand } from "./Brand.tsx";

export function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = recentDocs();

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/docs", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const { id } = await res.json();
      location.assign(`/d/${id}`);
    } catch (e) {
      setError(String((e as Error).message));
      setBusy(false);
    }
  };

  return (
    <div className="home">
      <header className="home-head">
        <Brand />
      </header>
      <main className="home-main">
        <h1 className="screen-title">Documents for people and agents</h1>
        <p className="lede">
          Write together in real time. Agents join with the <code>komore</code> CLI, and everyone sees each other's
          edits, cursors and comments as they happen.
        </p>
        <Button variant="primary" onClick={create} disabled={busy}>
          {busy ? "Creating…" : "New document"}
        </Button>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {recent.length > 0 && (
          <section className="home-section">
            <h2 className="section-label">Recently opened in this browser</h2>
            <ul className="surface recent-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <a href={`/d/${r.id}`}>{r.title || "Untitled document"}</a>
                  <span className="meta">{new Date(r.ts).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="home-section">
          <h2 className="section-label">For agents</h2>
          <pre className="code-block">npx skills add digitalex/komore --skill komore</pre>
          <p className="body-text">
            Then give the agent a document URL. The skill is also served at <a href="/SKILL.md">/SKILL.md</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
