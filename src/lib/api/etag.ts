export function strongEtag(hash: string): string {
  return `"sha256:${hash}"`;
}
export function parseIfMatch(header: string | null): string | null {
  if (!header) return null;
  return header.trim().replace(/^"|"$/g, "").replace(/^sha256:/, "");
}
