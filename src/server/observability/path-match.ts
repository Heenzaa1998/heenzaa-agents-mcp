function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function normalizePattern(pattern: string) {
  const trimmed = pattern.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function createPatternRegex(pattern: string) {
  return new RegExp(`^${escapeRegex(pattern).replaceAll("*", ".*")}$`);
}

export function normalizeTraceIgnorePatterns(rawValue: string | null | undefined) {
  return (rawValue ?? "")
    .split(",")
    .map(normalizePattern)
    .filter((pattern): pattern is string => Boolean(pattern));
}

export function createPathIgnoreMatcher(patterns: readonly string[]) {
  const matchers = patterns.map(createPatternRegex);

  return (pathname: string) => matchers.some((matcher) => matcher.test(pathname));
}

export function shouldIgnoreTracePath(
  pathname: string,
  rawPatterns: string | null | undefined,
) {
  return createPathIgnoreMatcher(normalizeTraceIgnorePatterns(rawPatterns))(pathname);
}
