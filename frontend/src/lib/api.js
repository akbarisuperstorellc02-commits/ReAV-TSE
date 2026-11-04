export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = window.reavDesktop?.apiBase || '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
