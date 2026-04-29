import { Employee } from './employee';

export interface LoginResponse {
  message: string;
  user: Employee;
  token: string;
}
