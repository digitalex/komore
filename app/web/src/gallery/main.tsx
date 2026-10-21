import { createRoot } from "react-dom/client";
import { ThemeRoot } from "../theme/ThemeRoot.tsx";
import { Gallery } from "./Gallery.tsx";
import "../../../components/graphical/styles.css";
import "../theme/fonts.css";
import "../styles.css";
import "./gallery.css";

createRoot(document.getElementById("root")!).render(
  <ThemeRoot>
    <Gallery />
  </ThemeRoot>,
);
