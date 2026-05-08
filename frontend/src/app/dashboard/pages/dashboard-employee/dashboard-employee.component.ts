import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmployeeDashboard } from '../../../shared/models/dashboard';
import { Employee } from '../../../shared/models/employee';

@Component({
  selector: 'app-dashboard-employee',
  templateUrl: './dashboard-employee.component.html',
  styleUrls: ['./dashboard-employee.component.css']
})
export class DashboardEmployeeComponent implements OnInit {
  dashboardData: EmployeeDashboard | null = null;
  currentUser: Employee | null = null;
  loading: boolean = true;
  error: string = '';
  reservations: any[] = []; // Store full history here
  showConfirmDialog = false;
  kmFin: number | null = null;

  // 📋 Reservation Details Modal
  showDetailModal = false;
  selectedReservation: any = null;
  editMode = false;
  cancelMode = false;
  cancelReason = '';

  // Form fields for edit
  editData = {
    mission: '',
    date_debut: '',
    date_fin: ''
  };

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private reservationService: ReservationService,
    private toastService: ToastService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.authService.isAdmin() || this.authService.isResponsable()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    if (this.currentUser?.id) {
      this.loadDashboard(this.currentUser.id);
      this.loadReservations(this.currentUser.id);
    }
  }

  loadDashboard(employeeId: number): void {
    this.loading = true;
    this.dashboardService.getEmployeeDashboard(employeeId).subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onMissionComplete(): void {
    this.showConfirmDialog = true;
  }

  confirmReturn(): void {
    if (!this.dashboardData?.active_reservation?.id) return;
    if (!this.kmFin || this.kmFin <= 0) {
      alert('Veuillez entrer le kilométrage final');
      return;
    }

    this.reservationService.return(this.dashboardData.active_reservation.id, this.kmFin).subscribe({
      next: () => {
        this.showConfirmDialog = false;
        this.toastService.success('Véhicule rendu avec succès !');
        this.refreshData();
      },
      error: (err) => {
        alert(err.error?.message || 'Erreur lors du retour du véhicule');
      }
    });
  }

  cancelReturn(): void {
    this.showConfirmDialog = false;
    this.kmFin = null;
  }

  loadReservations(employeeId: number): void {
    this.reservationService.getAll({ employee_id: employeeId }).subscribe({
      next: (data) => {
        this.reservations = data;
      },
      error: (err) => console.error('Error loading history:', err)
    });
  }

  refreshData(): void {
    if (this.currentUser?.id) {
      this.loadDashboard(this.currentUser.id);
      this.loadReservations(this.currentUser.id);
    }
  }

  // 🔍 MODAL LOGIC
  viewDetails(reservation: any): void {
    this.selectedReservation = reservation;
    this.showDetailModal = true;
    this.editMode = false;
    this.cancelMode = false;

    // Prep edit data
    this.editData = {
      mission: reservation.mission,
      date_debut: this.formatDateForInput(reservation.date_debut),
      date_fin: reservation.date_fin ? this.formatDateForInput(reservation.date_fin) : ''
    };
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedReservation = null;
    this.editMode = false;
    this.cancelMode = false;
  }

  toggleEdit(): void {
    if (this.selectedReservation?.status !== 'pending') {
      alert('Seules les réservations en attente peuvent être modifiées.');
      return;
    }
    this.editMode = !this.editMode;
    this.cancelMode = false;
  }

  toggleCancel(): void {
    const s = this.selectedReservation?.status;
    if (s === 'completed' || s === 'rejected' || s === 'cancelled') {
      alert('Cette réservation ne peut plus être annulée.');
      return;
    }
    this.cancelMode = !this.cancelMode;
    this.editMode = false;
    this.cancelReason = '';
  }

  saveUpdate(): void {
    if (!this.selectedReservation?.id) return;
    this.loading = true;
    this.reservationService.update(this.selectedReservation.id, this.editData as any).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Réservation modifiée avec succès');
        this.closeModal();
        this.refreshData();
      },
      error: (err) => {
        this.loading = false;
        alert(err.error?.message || 'Erreur lors de la mise à jour');
      }
    });
  }

  confirmCancel(): void {
    if (!this.selectedReservation?.id) return;
    this.loading = true;
    this.reservationService.cancel(this.selectedReservation.id, this.cancelReason).subscribe({
      next: () => {
        this.loading = false;
        this.toastService.success('Réservation annulée');
        this.closeModal();
        this.refreshData();
      },
      error: (err) => {
        this.loading = false;
        alert(err.error?.message || 'Erreur lors de l\'annulation');
      }
    });
  }

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  }
  // Propriétés
showStartDialog = false;
kmDebut: number | null = null;
selectedStartReservation: any = null;

// Ouvrir la modale de départ
onStartMission(res: any): void {
  this.selectedStartReservation = res;
  this.kmDebut = null;
  this.showStartDialog = true;
}

// Fermer sans confirmer
cancelStart(): void {
  this.showStartDialog = false;
  this.selectedStartReservation = null;
  this.kmDebut = null;
}

// Valider le départ
confirmStart(): void {
  if (!this.kmDebut || !this.selectedStartReservation) return;

  this.loading = true;
  this.reservationService.startMission(
    this.selectedStartReservation.id,
    this.kmDebut
  ).subscribe({
    next: () => {
      this.showStartDialog = false;
      this.selectedStartReservation = null;
      this.kmDebut = null;
      this.loading = false;
      this.toastService.success('Mission démarrée avec succès !');
      this.refreshData();
    },
    error: (err: any) => {
      this.error = 'Erreur lors du démarrage de la mission.';
      this.loading = false;
    }
  });
}

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'in_progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }
}
