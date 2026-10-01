// Replacement for next/navigation in the standalone build, backed by the
// URL hash so it works from file:// with no server and no history API.
import { useEffect, useState } from "react";

export function currentPath(): string {
  const raw = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  const path = raw.split("?")[0];
  return path.startsWith("/") ? path : "/";
}

export function navigate(to: string) {
  window.location.hash = to;
  // Hash changes don't reset scroll the way a real navigation does.
  window.scrollTo({ top: 0 });
}

/** Subscribe to hash-router path changes. */
export function usePathname(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return path;
}

export function useRouter() {
  return {
    push: navigate,
    replace: (to: string) => window.location.replace(`#${to}`),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams(): URLSearchParams {
  const [params, setParams] = useState(() => readSearch());
  useEffect(() => {
    const onChange = () => setParams(readSearch());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return params;
}

function readSearch(): URLSearchParams {
  const raw = window.location.hash.slice(1);
  const qs = raw.includes("?") ? raw.split("?")[1] : "";
  // Presenter mode is also passed on the real query string (?presenter=1).
  const real = window.location.search.startsWith("?")
    ? window.location.search.slice(1)
    : "";
  return new URLSearchParams([qs, real].filter(Boolean).join("&"));
}

export function notFound(): never {
  throw new Error("NEXT_NOT_FOUND");
}
