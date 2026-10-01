import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { DemoProvider } from "@/demo/store";
import { Router } from "./router";
import "@/app/globals.css";

function App() {
  return (
    <DemoProvider>
      <Router />
      <Toaster
        richColors
        position="top-right"
        toastOptions={{ style: { borderRadius: "0.75rem" } }}
      />
    </DemoProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
