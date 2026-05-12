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

export interface DailyData {
  day: string;
  full_date: string;
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

export interface InsuranceAlert {
  id: number;
  marque: string;
  modele: string;
  matricule: string;
  assurance_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}

export interface ReservationCalendarItem {
  id: number;
  date: string;
  date_fin: string | null;
  mission: string;
  status: string;
}

export interface DestinationHeatmapPoint {
  destination: string;
  count: number;
  end_lat: number | null;
  end_lng: number | null;
}

export interface AdminDashboard {
  vehicles: VehicleStats;
  reservations: ReservationStats;
  employees: EmployeeStats;
  charts: {
    reservations_by_month: ChartData[];
    maintenances_by_month: ChartData[];
    reservations_last_7_days: DailyData[];
    reservations_previous_7_days: DailyData[];
  };
  top_vehicles: Vehicle[];
  pending_reservations: Reservation[];
  maintenance_costs_this_month: number;
  maintenance_alerts: MaintenanceAlert[];
  in_maintenance: Vehicle[];
  active_today: {
    count: number;
    list: Vehicle[];
  };
  maintenances_this_week: {
    count: number;
    list: Vehicle[];
  };
  insurance_expiring: InsuranceAlert[];
  approved_reservations_dates: ReservationCalendarItem[];
  destination_heatmap: DestinationHeatmapPoint[];
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
  planned_reservations: Reservation[];
  recent_reservations: Reservation[];
}
