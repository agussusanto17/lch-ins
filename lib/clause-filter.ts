/** Clause fields the slip picker filters on. */
export type ClauseScope = {
  cobName: string | null
  coverTypeName: string | null
}

/**
 * Earthquake covers: PSAGBI (the standard earthquake policy, where EQVET
 * clauses are mapped), the combined PAR + EQ cover, and legacy "PAR + EQVET".
 */
export function isEarthquakeCover(name: string): boolean {
  return /\b(psagbi|earthquake|eqvet|gempa)\b/i.test(name)
}

/**
 * Whether a clause belongs in the picker of a slip with these COB and types
 * of cover. A clause without a COB or cover type applies to every one.
 */
export function clauseFitsSlip(
  clause: ClauseScope,
  cob: string,
  slipCovers: string[]
): boolean {
  const clauseCob = clause.cobName?.toLowerCase()
  if (clauseCob && clauseCob !== "all" && clauseCob !== cob.toLowerCase()) {
    return false
  }
  const covers = slipCovers.filter(Boolean).map((c) => c.toLowerCase())
  if (!clause.coverTypeName || covers.length === 0) return true

  const clauseCover = clause.coverTypeName.toLowerCase()
  if (covers.some((c) => c.includes(clauseCover) || clauseCover.includes(c))) {
    return true
  }
  // Slips with PAR + EQ under one combined cover name still need EQVET clauses.
  return isEarthquakeCover(clauseCover) && covers.some(isEarthquakeCover)
}
