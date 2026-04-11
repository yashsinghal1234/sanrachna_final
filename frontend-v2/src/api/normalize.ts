/** Accepts raw array or common wrapper shapes from REST APIs. */
export function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.data)) return o.data
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.results)) return o.results
  }
  return []
}
