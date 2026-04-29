import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Employee } from '../../shared/models/employee';
import { LoginResponse } from 'src/app/shared/models/login-response';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/employees`;
  private currentUserSubject = new BehaviorSubject<Employee | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    // The backend exposes login at /api/login (not /api/employees/login)
    return this.http.post<LoginResponse>(`${environment.apiUrl}/login`, { email, password }).pipe(
      tap((res: LoginResponse) => {
        // stocker token
        localStorage.setItem('token', res.token);

        // stocker user
        localStorage.setItem('currentUser', JSON.stringify(res.user));

        this.currentUserSubject.next(res.user);
      })
    );
  }

  register(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/forgot-password`, { email });
  }

  resetPassword(email: string, token: string, password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/reset-password`, { email, token, password });
  }

  setFirstLoginPassword(skip: boolean, password?: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/first-login-pass`, { skip, password });
  }

  changePassword(password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/change-password`, { password });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): Employee | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isResponsable(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'responsable';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
