import { StrictMode } from "react"

import { PersistGate } from "redux-persist/integration/react"
import { Provider } from "react-redux"
import { RouterProvider } from "react-router-dom"
import { createRoot } from "react-dom/client"

import { TenantMissing } from "@/components/tenant-missing"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import { router } from "@/routes"
import { store, persistor } from "@/lib/redux/store"
import {
  getPlatformAppUrl,
  isMissingTenant,
  tenantExists,
} from "@/lib/utils/tenant"

import { ErrorBoundary } from "./error-boundary"

import "./index.css"

// Without a college in the hostname there is no schema to talk to, so the app
// says so rather than booting into a screen where every request fails.
async function bootstrap() {
  if ((await tenantExists()) === false) {
    window.location.replace(getPlatformAppUrl())
    return
  }

  const root = createRoot(document.getElementById("root")!)

  if (isMissingTenant()) {
    root.render(
      <StrictMode>
        <ThemeProvider>
          <TenantMissing />
        </ThemeProvider>
      </StrictMode>
    )
  } else {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <TooltipProvider>
                <ThemeProvider>
                  <RouterProvider router={router} />
                  <Toaster richColors position="top-right" />
                </ThemeProvider>
              </TooltipProvider>
            </PersistGate>
          </Provider>
        </ErrorBoundary>
      </StrictMode>
    )
  }
}

void bootstrap()
