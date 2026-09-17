export const FORGE_LOCAL_DATA_CHANGED = "forge:local-data-changed";
export const FORGE_CLOUD_DATA_HYDRATED = "forge:cloud-data-hydrated";
export const FORGE_CLOUD_DIRTY_KEY = "forge_cloud_dirty_v1";

export function notifyLocalDataChanged(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FORGE_CLOUD_DIRTY_KEY, "1");
  window.dispatchEvent(new Event(FORGE_LOCAL_DATA_CHANGED));
}
