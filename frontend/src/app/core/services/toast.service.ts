import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new Subject<Toast>();
  private toastId = 0;

  constructor() {}

  getToasts(): Observable<Toast> {
    return this.toasts$.asObservable();
  }

  success(message: string, duration: number = 5000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 5000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 5000): void {
    this.show(message, 'warning', duration);
  }

  private show(message: string, type: Toast['type'], duration: number): void {
    this.toastId++;
    this.toasts$.next({
      id: this.toastId,
      message,
      type,
      duration
    });
  }
}
