import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification } from '../../shared/models/notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  // 📬 Notification state
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);
  private pollingSubscription?: Subscription;

  constructor(private http: HttpClient) { }

  // 🔔 Get notifications observable
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  // 🔢 Get unread count observable
  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // 🔄 Start polling for new notifications
  startPolling(intervalMs: number = 10000): void {
    this.stopPolling();
    this.loadNotifications();

    this.pollingSubscription = interval(intervalMs)
      .pipe(switchMap(() => this.getMyNotifications()))
      .subscribe(notifications => this.updateNotifications(notifications));
  }

  // ⏹️ Stop polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  // 📥 Load notifications once
  loadNotifications(): void {
    this.getMyNotifications().subscribe(notifications => {
      this.updateNotifications(notifications);
    });
  }

  // 🔄 Update notifications and count
  private updateNotifications(notifications: Notification[]): void {
    const current = this.notifications$.getValue();

    // Check for new notifications
    const newNotifications = notifications.filter(n =>
      !current.find(c => c.id === n.id)
    );

    this.notifications$.next(notifications);
    this.unreadCount$.next(notifications.filter(n => !n.is_read).length);
  }

  // 📋 HTTP Methods
  getMyNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/me`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const notifications = this.notifications$.getValue();
        const updated = notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        );
        this.updateNotifications(updated);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    const notifications = this.notifications$.getValue();
    const unread = notifications.filter(n => !n.is_read);

    // Mark each as read
    const promises = unread.map(n => this.markAsRead(n.id!).toPromise());
    return new Observable(observer => {
      Promise.all(promises).then(() => {
        observer.next({ message: 'All notifications marked as read' });
        observer.complete();
      });
    });
  }
}
