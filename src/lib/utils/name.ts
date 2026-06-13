// Helpers for the "First name + Last name" inputs the app uses everywhere a
// person's name is collected. Some backends still store a single legal-name
// string (e.g. landlordIdentity.legalFullName, the contract typedName), so we
// split that string back into two fields on load and re-join the two fields
// into one string on save.

export interface NameParts {
  firstName: string;
  lastName: string;
}

/**
 * Split a stored single-string name into first/last for the two inputs.
 * The first whitespace-separated token is the first name, the remainder is the
 * last name (so "Somchai Por Jaidee" -> "Somchai" / "Por Jaidee"). Best-effort
 * and lossless when re-joined for typical "First Last" names.
 */
export function splitFullName(full: string | null | undefined): NameParts {
  const trimmed = (full ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, spaceIdx),
    lastName: trimmed.slice(spaceIdx + 1),
  };
}

/** Join first/last back into the single string the backend expects. */
export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}
