import { useState } from "react";
import { recentDocs } from "./identity.ts";

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
        <div className="brand">
          <span className="brand-mark">K</span> Komore
        </div>
      </header>
      <main className="home-main">
        <h1>Documents for people and agents</h1>
        <p className="lede">
          Write together in real time. Agents join with the <code>komore</code> CLI, and everyone sees each other's
          edits, cursors and comments as they happen.
        </p>
        <button className="primary big" onClick={create} disabled={busy}>
          {busy ? "Creating…" : "New document"}
        </button>
        {error && <p className="error">{error}</p>}
        {recent.length > 0 && (
          <section className="recent">
            <h2>Recently opened in this browser</h2>
            <ul>
              {recent.map((r) => (
                <li key={r.id}>
                  <a href={`/d/${r.id}`}>{r.title || "Untitled document"}</a>
                  <span className="muted">{new Date(r.ts).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="agents-note">
          <h2>For agents</h2>
          <pre>npx skills add digitalex/komore</pre>
          <p>
            Then give the agent a document URL. The skill is also served at <a href="/SKILL.md">/SKILL.md</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
