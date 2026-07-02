/** Values for route_stops.stop_type — mirrors the DB enum stop_type_enum */
export const STOP_TYPE = {
  COLLECTION: 'collection',
  DROPOFF: 'dropoff',
} as const;

export type StopType = (typeof STOP_TYPE)[keyof typeof STOP_TYPE];
