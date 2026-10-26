const DARK_QUERY = "(prefers-color-scheme: dark)";

export function followColorScheme(target: Document): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const apply = () =>
    target.documentElement.classList.toggle("dark", query.matches);
  apply();
  query.addEventListener("change", apply);
  return () => query.removeEventListener("change", apply);
}
