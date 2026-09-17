import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers/AppProviders";
import { router } from "@/app/router";

// Self-hosted font weights (JS imports, not CSS @import — lets Vite's own
// asset pipeline rewrite each woff2 url() and emit the file, which the
// Tailwind v4 / Lightning CSS bundler does not do for CSS-level @import).
import "@fontsource/ibarra-real-nova/400.css";
import "@fontsource/ibarra-real-nova/500.css";
import "@fontsource/ibarra-real-nova/600.css";
import "@fontsource/ibarra-real-nova/700.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/public-sans/800.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
