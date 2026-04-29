import { Vehicle } from './vehicle';

export interface Maintenance {
  id?: number;
  vehicle_id: number | string;
  type: string;
  description?: string;
  cost: number;
  return_date?: Date | string;
  vehicle?: Vehicle;
  created_at?: Date;
  updated_at?: Date;
}

export const selectedMaintenance: Maintenance = {
  vehicle_id: '',
  type: 'maintenance',
  description: '',
  cost: 0,
  return_date: undefined
};
