// The app's theme scope: the Graphical provider (theme variables, component
// appearances, motion, and their propagation into portals), the icon adapter,
// and the Base UI providers the app's tooltips and toasts share.
import { useCallback, type ReactNode } from "react";
import { GraphicalProvider, IconRendererProvider, Toast, Tooltip, type ColorMode } from "@graphical";
import { appTheme } from "./document.ts";
import { renderThemeIcon } from "./icons.tsx";

/**
 * The app's light/dark state. Komore is a light-only app today (its document
 * colours are authored against a white page), so this is the single place a
 * dark mode would be connected.
 */
export function useColorMode(): ColorMode {
  return "light";
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const colorMode = useColorMode();
  return (
    <GraphicalProvider document={appTheme} colorMode={colorMode}>
      <IconRendererProvider renderIcon={renderThemeIcon}>
        <Tooltip.Provider delay={400}>
          <Toast.Provider timeout={3000}>
            {children}
            <Toasts />
          </Toast.Provider>
        </Tooltip.Provider>
      </IconRendererProvider>
    </GraphicalProvider>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport>
        {toasts.map((t) => (
          <Toast.Root key={t.id} toast={t}>
            <Toast.Content>
              <Toast.Title />
              {t.description ? <Toast.Description /> : null}
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

/** Show a short confirmation, e.g. "Link copied". */
export function useNotify(): (title: string, description?: string) => void {
  const { add } = Toast.useToastManager();
  return useCallback((title: string, description?: string) => void add({ title, description }), [add]);
}
