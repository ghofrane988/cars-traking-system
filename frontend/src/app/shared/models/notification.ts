import { Employee } from './employee';

export interface Notification {
  id?: number;
  employee_id: number;
  message: string;
  link?: string;
  is_read: boolean;
  employee?: Employee;
  created_at?: Date;
}
