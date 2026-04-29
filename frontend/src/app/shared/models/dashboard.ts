import { Vehicle } from './vehicle';
import { Reservation } from './reservation';

export interface VehicleStats {
  total: number;
  disponible: number;
  reserve: number;
  maintenance: number;
  panne: number;
}

export interface ReservationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  this_month: number;
}

export interface EmployeeStats {
  total: number;
  admins: number;
  employes: number;
}

export interface ChartData {
  month: string;
  count: number;
}

export interface MaintenanceAlert {
  id: number;
  marque: string;
  modele: string;
  matricule: string;
  km: number;
  next_maintenance_km: number;
  km_remaining: number;
}

export interface AdminDashboard {
  vehicles: VehicleStats;
  reservations: ReservationStats;
  employees: EmployeeStats;
  charts: {
    reservations_by_month: ChartData[];
    maintenances_by_month: ChartData[];
  };
  top_vehicles: Vehicle[];
  pending_reservations: Reservation[];
  maintenance_costs_this_month: number;
  maintenance_alerts: MaintenanceAlert[];
  in_maintenance: Vehicle[];
}

export interface MyReservationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  this_month: number;
}

export interface EmployeeDashboard {
  my_reservations: MyReservationStats;
  active_reservation: Reservation | null;
  recent_reservations: Reservation[];
}
