import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css";
import "./styles/tokens.css";
import "./index.css";
import "./lib/i18n/index";
import App from "./App.tsx";
import { ThemeProvider } from "./components/layout/theme-provider";
import { installLatinOnlyInputGuard } from "./lib/utils/latin-only-input";

// Block non-Latin input (Cyrillic, CJK, Thai, emoji, …) across every text field.
// Per-field opt-out: add data-allow-intl="true" to the input or an ancestor.
installLatinOnlyInputGuard();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
          {/* UX-355: toasts sat in the top-right corner directly over the
              account menu + notification bell, blocking clicks, and could
              linger. Push the stack below the 80px topbar so the header
              controls stay clickable, auto-dismiss after 4s, and add a manual
              close button. */}
          <Toaster
            richColors
            position="top-right"
            offset={88}
            duration={4000}
            closeButton
          />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
