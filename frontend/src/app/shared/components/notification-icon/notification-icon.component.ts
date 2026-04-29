import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Notification } from '../../models/notification';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-notification-icon',
  templateUrl: './notification-icon.component.html',
  styleUrls: ['./notification-icon.component.css']
})
export class NotificationIconComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  notifications: Notification[] = [];
  showDropdown = false;

  private subscriptions: Subscription[] = [];
  isAdmin = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();

    if (user?.id) {
      // Start polling every 10 seconds
      this.notificationService.startPolling(10000);

      // Subscribe to unread count
      this.subscriptions.push(
        this.notificationService.getUnreadCount().subscribe(count => {
          this.unreadCount = count;
        })
      );

      // Subscribe to notifications
      this.subscriptions.push(
        this.notificationService.getNotifications().subscribe(notifications => {
          const previous = this.notifications;
          this.notifications = notifications;

          // Show toast for new notifications
          const newNotifs = notifications.filter(n =>
            !previous.find(p => p.id === n.id) && !n.is_read
          );
          newNotifs.forEach(n => this.showToast(n));
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  onNotificationClick(event: Event, notification: Notification): void {
    event.stopPropagation();

    // Mark as read
    if (notification.id) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    // Navigate to link if exists
    if (notification.link) {
      this.closeDropdown();
      this.router.navigate([notification.link]);
    }
  }

  markAsRead(event: Event, id?: number): void {
    event.stopPropagation();
    if (id) {
      this.notificationService.markAsRead(id).subscribe();
    }
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    const user = this.authService.getCurrentUser();
    if (user?.id) {
      this.notificationService.markAllAsRead().subscribe(() => {
        this.toastService.success('Toutes les notifications marquées comme lues');
      });
    }
  }

  private showToast(notification: Notification): void {
    this.toastService.info(notification.message);
  }
}
