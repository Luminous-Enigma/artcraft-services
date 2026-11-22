import { useEffect } from "react";

/**
 * Pages where people work on a picture, video or 3D scene. Soul Mark: Neon's grid stays off
 * there (html[data-workspace]), so its lines never sit behind someone's work; the glow on
 * panels stays.
 */
export const WORKSPACE_PATHS = [
  "/edit-image",
  "/edit-3d",
  "/video-editor",
  "/moodboard",
  "/background-change",
  "/frame-extractor",
  "/media",
];

export function isWorkspace(pathname: string): boolean {
  return WORKSPACE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Marks <html> while a workspace page is open. */
export function useWorkspaceMark(pathname: string) {
  useEffect(() => {
    const root = document.documentElement;
    if (isWorkspace(pathname)) root.dataset.workspace = "on";
    else delete root.dataset.workspace;
  }, [pathname]);
}
