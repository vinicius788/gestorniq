import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { AUTH_CONFIG } from "@/lib/auth-config";
import { initObservability } from "@/lib/observability";

initObservability();

const app = AUTH_CONFIG.clerkPublishableKey ? (
  <ClerkProvider publishableKey={AUTH_CONFIG.clerkPublishableKey}>
    <App />
  </ClerkProvider>
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(app);
