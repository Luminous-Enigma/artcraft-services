import { useEffect } from "react";

/**
 * Where people work on a picture, video or 3D scene, and what Soul Mark: Neon's grid does there
 * (html[data-workspace]). The rule: an editor that draws its own grid gets none of ours; an
 * editor without one keeps ours, dimmed; and any window inside it that draws its own grid
 * shows none of ours (styles.css finds those windows). The glow on panels stays everywhere.
 */
export const WORKSPACES: [path: string, grid: "off" | "dim"][] = [
  ["/edit-3d", "off"], // the 3D view draws its own floor grid
  ["/moodboard", "off"], // its canvas draws its own background, and it has a grid view
  ["/video-editor", "dim"], // its preview window has grid guides
  ["/edit-image", "dim"], // its canvas shows a checkerboard behind see-through parts
  ["/background-change", "dim"],
  ["/frame-extractor", "dim"],
  ["/media", "dim"],
];

export function workspaceGrid(pathname: string): "off" | "dim" | null {
  const hit = WORKSPACES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}

/** Marks <html> with the open page's grid rule. */
export function useWorkspaceMark(pathname: string) {
  useEffect(() => {
    const root = document.documentElement;
    const grid = workspaceGrid(pathname);
    if (grid) root.dataset.workspace = grid;
    else delete root.dataset.workspace;
  }, [pathname]);
}
