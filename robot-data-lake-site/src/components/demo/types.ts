export type F = { projects: string[]; events: string[]; roads: string[]; from?: number; to?: number };
export type Facet = { v: string; c: number };
export type Facets = { total: number; resolvedWhere: string; projects: Facet[]; events: Facet[]; roads: Facet[] };
export type Agg = {
  byEvent: { event_type: string; c: number }[]; byProject: { project: string; c: number }[];
  byDay: { day: string; c: number }[]; hotspots: { road_name: string; c: number }[];
};
