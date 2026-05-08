import { Component, OnInit } from '@angular/core';
import { MaintenanceService } from '../../../core/services/maintenance.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { Maintenance } from '../../../shared/models/maintenance';
import { Vehicle } from '../../../shared/models/vehicle';

@Component({
  selector: 'app-maintenance-history',
  templateUrl: './maintenance-history.component.html',
  styleUrls: ['./maintenance-history.component.css']
})
export class MaintenanceHistoryComponent implements OnInit {
  maintenances: Maintenance[] = [];
  vehicles: Vehicle[] = [];
  loading = true;
  error = '';
  showModal = false;
  isEditing = false;
  showDetailModal = false;
  selectedMaintenanceForDetail: Maintenance | null = null;

  selectedMaintenance: Maintenance = {
    vehicle_id: '',
    type: 'maintenance',
    description: '',
    cost: 0,
    return_date: undefined
  };

  constructor(
    private maintenanceService: MaintenanceService,
    private vehicleService: VehicleService
  ) { }

  ngOnInit(): void {
    this.loadMaintenances();
    this.loadVehicles();
  }

  loadMaintenances(): void {
    this.loading = true;
    this.maintenanceService.getAll().subscribe({
      next: (data) => {
        this.maintenances = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des maintenances';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadVehicles(): void {
    this.vehicleService.getAll().subscribe({
      next: (data) => {
        this.vehicles = data.filter(v => v.statut !== 'En maintenance');
      },
      error: (err) => console.error('Erreur chargement véhicules:', err)
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.selectedMaintenance = {
      vehicle_id: '',
      type: 'maintenance',
      description: '',
      cost: 0,
      return_date: undefined
    };
    this.showModal = true;
  }

  editMaintenance(maintenance: Maintenance): void {
    this.isEditing = true;
    this.selectedMaintenance = { ...maintenance };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveMaintenance(): void {
    // Format data before sending
    const maintenanceData: any = {
      vehicle_id: Number(this.selectedMaintenance.vehicle_id),
      type: this.selectedMaintenance.type,
      description: this.selectedMaintenance.description,
      cost: Number(this.selectedMaintenance.cost)
    };

    // Format date to YYYY-MM-DD if provided
    if (this.selectedMaintenance.return_date) {
      const date = new Date(this.selectedMaintenance.return_date);
      maintenanceData.return_date = date.toISOString().split('T')[0];
    }

    if (!maintenanceData.vehicle_id) {
      alert('Veuillez sélectionner un véhicule');
      return;
    }

    if (this.isEditing && this.selectedMaintenance.id) {
      this.maintenanceService.update(this.selectedMaintenance.id, maintenanceData).subscribe({
        next: () => {
          alert('✅ Maintenance modifiée avec succès !');
          this.loadMaintenances();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur mise à jour:', err);
          alert('❌ Erreur lors de la modification: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.maintenanceService.create(maintenanceData).subscribe({
        next: () => {
          alert('✅ Maintenance enregistrée avec succès !');
          this.loadMaintenances();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur création:', err);
          alert('❌ Erreur lors de l\'enregistrement: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  deleteMaintenance(id: number): void {
    if (confirm('Supprimer cette maintenance ?')) {
      this.maintenanceService.delete(id).subscribe({
        next: () => this.loadMaintenances(),
        error: (err) => console.error('Erreur suppression:', err)
      });
    }
  }

  backToService(id: number): void {
    this.maintenanceService.backToService(id).subscribe({
      next: () => this.loadMaintenances(),
      error: (err) => console.error('Erreur:', err)
    });
  }

  getVehicleName(vehicleId: number | string | undefined): string {
    if (!vehicleId) return 'N/A';
    const id = Number(vehicleId);
    const vehicle = this.vehicles.find(v => v.id === id);
    return vehicle ? `${vehicle.marque} ${vehicle.modele}` : 'Véhicule #' + vehicleId;
  }

  // Truncate long descriptions
  truncateDescription(desc: string, maxLength: number = 50): string {
    if (!desc) return '';
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength) + '...';
  }

  // Check if description is long
  isLongDescription(desc: string, maxLength: number = 50): boolean {
    return !!desc && desc.length > maxLength;
  }

  // Open detail modal with full maintenance report
  openDetailModal(maintenance: Maintenance): void {
    this.selectedMaintenanceForDetail = maintenance;
    this.showDetailModal = true;
  }

  // Close detail modal
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedMaintenanceForDetail = null;
  }
}
