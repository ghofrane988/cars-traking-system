import { Vehicle } from './vehicle';
import { Employee } from './employee';

export interface Reservation {
  id?: number;
  vehicle_id?: number;
  employee_id: number;
  date_debut: Date | string;
  date_fin?: Date | string;
  mission: string;
  destination?: string;
  km_debut?: number;
  km_fin?: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  vehicle?: Vehicle;
  employee?: Employee;
  created_at?: Date;
  updated_at?: Date;
  // GPS coordinates for trip routing
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  estimated_distance?: number;
  estimated_duration?: number;
}

export interface ReservationWithRoute extends Reservation {
  start_address?: string;
  end_address?: string;
}
