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
  isEmployee = false;
  private isFirstLoad = true; // 🔄 Flag pour éviter toasts au reload
  private shownToastIds = new Set<number>(); // 🚫 Tracker pour éviter doublons de toasts

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();
    this.isEmployee = !this.isAdmin && !this.authService.isResponsable();

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

          // Show toast for new notifications (skip on first load to avoid spam on page reload)
          if (!this.isFirstLoad) {
            const newNotifs = notifications.filter(n =>
              !previous.find(p => p.id === n.id) && !n.is_read
            );
            newNotifs.forEach(n => this.showToast(n));
          }
          this.isFirstLoad = false;
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // 🚨 Sort notifications: Emergency first, then unread, then read
  get sortedNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => {
      const aIsEmergency = this.isEmergencyAlert(a.message);
      const bIsEmergency = this.isEmergencyAlert(b.message);

      // Emergency alerts always come first
      if (aIsEmergency && !bIsEmergency) return -1;
      if (!aIsEmergency && bIsEmergency) return 1;

      // Then sort by unread status
      if (!a.is_read && b.is_read) return -1;
      if (a.is_read && !b.is_read) return 1;

      // Finally sort by date (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
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

    // Navigate: employee always goes to their dashboard, admin/responsable follow the link
    this.closeDropdown();
    if (this.isEmployee) {
      this.router.navigate(['/employee/dashboard']);
    } else if (notification.link) {
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
    // Éviter les doublons - ne pas afficher si déjà montré
    if (notification.id && this.shownToastIds.has(notification.id)) {
      return;
    }

    // Marquer comme affiché
    if (notification.id) {
      this.shownToastIds.add(notification.id);
    }

    // 🚨 Use warning toast for emergency alerts
    if (this.isEmergencyAlert(notification.message)) {
      this.toastService.warning('🚨 ' + notification.message, 8000); // Longer duration for emergencies
    } else {
      this.toastService.info(notification.message);
    }
  }

  // 🚨 Check if notification is an emergency alert
  isEmergencyAlert(message: string): boolean {
    if (!message) return false;
    const emergencyKeywords = ['emergency', 'urgence', '🚨', 'alert', 'critical', 'critique', 'high-risk', 'danger'];
    const lowerMessage = message.toLowerCase();
    return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
