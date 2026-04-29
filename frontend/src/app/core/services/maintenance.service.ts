import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Maintenance } from '../../shared/models/maintenance';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private apiUrl = `${environment.apiUrl}/maintenances`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Maintenance[]> {
    return this.http.get<Maintenance[]>(this.apiUrl);
  }

  getById(id: number): Observable<Maintenance> {
    return this.http.get<Maintenance>(`${this.apiUrl}/${id}`);
  }

  create(maintenance: Maintenance): Observable<Maintenance> {
    return this.http.post<Maintenance>(this.apiUrl, maintenance);
  }

  update(id: number, maintenance: Maintenance): Observable<Maintenance> {
    return this.http.put<Maintenance>(`${this.apiUrl}/${id}`, maintenance);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  backToService(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/back-to-service`, {});
  }
}
