import { createRoot } from "react-dom/client";
import { Home } from "./Home.tsx";
import { DocPage } from "./DocPage.tsx";
import { ThemeRoot } from "./theme/ThemeRoot.tsx";
// The Graphical library stylesheet: imported exactly once, before the app's own styles.
import "../../components/graphical/styles.css";
import "./theme/fonts.css";
import "./styles.css";

function App() {
  const m = /^\/d\/([A-Za-z0-9_-]+)\/?$/.exec(location.pathname);
  if (m) return <DocPage id={m[1]} />;
  return <Home />;
}

createRoot(document.getElementById("root")!).render(
  <ThemeRoot>
    <App />
  </ThemeRoot>,
);
