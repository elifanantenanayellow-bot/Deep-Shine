// Single source of truth for the persisted demo payload's localStorage key.
// Bump the suffix whenever the stored shape changes: older payloads are then
// ignored and the demo reseeds instead of rendering against a missing field.
// Kept in its own dependency-free module so the E2E suite can import it
// rather than hardcoding the string in a dozen places.
export const STORAGE_KEY = "deepshine-demo-v6";
