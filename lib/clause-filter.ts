/** Clause fields the slip picker filters on. */
export type ClauseScope = {
  cobName: string | null
  coverTypeName: string | null
  sourceGroup?: string
}

/**
 * Earthquake covers: PSAGBI (the standard earthquake policy, where EQVET
 * clauses are mapped), the combined PAR + EQ cover, and legacy "PAR + EQVET".
 */
export function isEarthquakeCover(name: string): boolean {
  return /\b(psagbi|earthquake|eqvet|gempa)\b/i.test(name)
}

function isCashInTransit(name: string) {
  return /cash in transit/i.test(name)
}

/**
 * Clauses without COB or cover type fit every slip; cover names must match exactly, except
 * slip covers outside `knownCovers` (older free-text names), which match by fragment.
 */
export function clauseFitsSlip(
  clause: ClauseScope,
  cob: string,
  slipCovers: string[],
  knownCovers: string[] = []
): boolean {
  const clauseCob = clause.cobName?.toLowerCase()
  if (clauseCob && clauseCob !== "all" && clauseCob !== cob.toLowerCase()) {
    return false
  }
  const covers = slipCovers.filter(Boolean).map((c) => c.toLowerCase())
  if (covers.length === 0) return true
  // Cash In Transit has its own clause group, so general Cargo ones stay out (SIT-035).
  if (clause.sourceGroup === "Cargo" && covers.every(isCashInTransit)) return false
  if (!clause.coverTypeName) return true

  const clauseCover = clause.coverTypeName.toLowerCase().trim()
  const known = new Set(knownCovers.map((c) => c.toLowerCase().trim()))
  if (covers.some((c) => c.trim() === clauseCover)) return true
  const legacy = covers.filter((c) => !known.has(c.trim()))
  if (legacy.some((c) => c.includes(clauseCover) || clauseCover.includes(c))) {
    return true
  }
  // Slips with PAR + EQ under one combined cover name still need EQVET clauses.
  return isEarthquakeCover(clauseCover) && covers.some(isEarthquakeCover)
}
