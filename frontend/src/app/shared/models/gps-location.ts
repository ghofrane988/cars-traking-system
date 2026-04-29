import { Vehicle } from './vehicle';

export interface GpsLocation {
  id?: number;
  vehicle_id?: number;
  reservation_id?: number;
  latitude: number;
  longitude: number;
  speed?: number;
  distance_cumulative?: number;
  recorded_at?: string;
  timestamp?: Date;
  vehicle?: Vehicle;
  created_at?: Date | string;
  updated_at?: Date | string;
}
