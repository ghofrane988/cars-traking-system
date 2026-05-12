import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Reservation } from '../../shared/models/reservation';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) { }

  getAll(params?: any): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl, { params });
  }

  search(searchTerm: string, filters?: any): Observable<Reservation[]> {
    const params: any = { search: searchTerm, ...filters };
    return this.http.get<Reservation[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  create(reservation: Reservation): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, reservation);
  }

  update(id: number, reservation: Reservation): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}`, reservation);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  approve(id: number, vehicleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/approve`, { vehicle_id: vehicleId });
  }

  reject(id: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reject`, { reason });
  }

  return(id: number, kmFin: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/return`, { km_fin: kmFin });
  }

  cancel(id: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancel`, { reason });
  }

  getCalendar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/calendar`);
  }
  startMission(reservationId: number, kmDebut: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservationId}/start`, { km_debut: kmDebut });
  }
}
