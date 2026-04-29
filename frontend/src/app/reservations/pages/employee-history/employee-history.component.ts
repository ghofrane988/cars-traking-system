import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../../../core/services/reservation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Reservation } from '../../../shared/models/reservation';
import { Employee } from '../../../shared/models/employee';

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-history.component.html',
  styleUrls: ['./employee-history.component.css']
})
export class EmployeeHistoryComponent implements OnInit {
  reservations: Reservation[] = [];
  currentUser: Employee | null = null;
  loading = false;
  error = '';

  // Statistics
  totalReservations = 0;
  approvedCount = 0;
  pendingCount = 0;
  rejectedCount = 0;

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    const userId = this.currentUser?.id;
    if (!userId) {
      this.error = 'Utilisateur non connecté';
      return;
    }

    this.reservationService.getAll({ employee_id: userId }).subscribe({
      next: (data) => {
        this.reservations = data.sort((a, b) => {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de l\'historique';
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.totalReservations = this.reservations.length;
    this.approvedCount = this.reservations.filter(r => r.status === 'approved').length;
    this.pendingCount = this.reservations.filter(r => r.status === 'pending').length;
    this.rejectedCount = this.reservations.filter(r => r.status === 'rejected').length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Approuvée';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  }
}
