export function normalizeUserId(value: unknown): string | null {
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim()))
    return value.trim();
  return null;
}
export function getAuthorId(
  value: { authorId?: unknown; author?: { id?: unknown } } | null,
) {
  return normalizeUserId(value?.authorId ?? value?.author?.id);
}
export function getViewerId(
  value: { userId?: unknown; id?: unknown } | null | undefined,
) {
  return normalizeUserId(value?.userId ?? value?.id);
}