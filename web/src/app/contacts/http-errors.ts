export function isUnauthorized(error: unknown): boolean {
  return (error as { status?: number })?.status === 401;
}
