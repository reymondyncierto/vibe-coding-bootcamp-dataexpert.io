export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getRequestId(headers: Headers) {
  return (
    headers.get("x-request-id") ||
    headers.get("x-vercel-id") ||
    crypto.randomUUID()
  );
}

export function safeJsonParse<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
