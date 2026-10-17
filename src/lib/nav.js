// Tab (page) navigation shared by the tab bar and by buttons that open a tab.
import { createContext } from "react";

/** Link to a tab: the main tab is the plain address, others use ?page=id. */
export function pageHref(id) {
  const path = window.location.pathname;
  return id === "main" ? path : `${path}?page=${encodeURIComponent(id)}`;
}

/** Opens a tab in the page, without reloading. Set by App. */
export const NavContext = createContext(() => {});
