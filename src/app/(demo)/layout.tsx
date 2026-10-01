import { Toaster } from "sonner";
import { DemoProvider } from "@/demo/store";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {children}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{ style: { borderRadius: "0.75rem" } }}
      />
    </DemoProvider>
  );
}
