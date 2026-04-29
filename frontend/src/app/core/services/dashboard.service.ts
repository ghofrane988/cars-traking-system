import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminDashboard, EmployeeDashboard } from '../../shared/models/dashboard';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(this.apiUrl);
  }

  getEmployeeDashboard(employeeId: number): Observable<EmployeeDashboard> {
    return this.http.get<EmployeeDashboard>(`${this.apiUrl}/employee/${employeeId}`);
  }
}
