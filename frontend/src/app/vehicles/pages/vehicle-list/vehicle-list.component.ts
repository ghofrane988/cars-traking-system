import { Component, OnInit } from '@angular/core';
import { VehicleService } from '../../../core/services/vehicle.service';
import { AuthService } from '../../../core/services/auth.service';
import { Vehicle } from '../../../shared/models/vehicle';

@Component({
  selector: 'app-vehicle-list',
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.css']
})
export class VehicleListComponent implements OnInit {
  vehicles: Vehicle[] = [];
  selectedVehicle: Vehicle | null = null;
  loading = true;
  error = '';
  isAdmin = false;
  isResponsable = false;

  showModal = false;
  modalMode: 'view' | 'edit' | 'delete' | 'create' = 'view';

  newVehicle: Vehicle = {
    marque: '',
    modele: '',
    matricule: '',
    annee: new Date().getFullYear(),
    statut: 'Disponible',
    consommation: undefined,
    assurance_date: undefined,
    visite_technique_date: undefined,
    vignette_date: undefined
  };

  importing = false;
  searchQuery = '';
  appliedSearchQuery = '';

  constructor(
    private vehicleService: VehicleService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isResponsable = this.authService.isResponsable();
    this.loadVehicles();
  }

  get filteredVehicles(): Vehicle[] {
    if (!this.appliedSearchQuery) return this.vehicles;
    const q = this.appliedSearchQuery.toLowerCase();
    return this.vehicles.filter(v => {
      return (v.marque && v.marque.toLowerCase().includes(q)) ||
        (v.modele && v.modele.toLowerCase().includes(q)) ||
        (v.matricule && v.matricule.toLowerCase().includes(q)) ||
        (v.statut && v.statut.toLowerCase().includes(q));
    });
  }

  applyFilter(): void {
    this.appliedSearchQuery = this.searchQuery;
  }

  loadVehicles(): void {
    this.loading = true;
    this.vehicleService.getAll().subscribe({
      next: (data) => {
        this.vehicles = (this.isAdmin || this.isResponsable) ? data : data.filter(v => v.statut === 'Disponible');
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des véhicules';
        this.loading = false;
        console.error(err);
      }
    });
  }

  openCreate(): void {
    this.modalMode = 'create';
    this.newVehicle = {
      marque: '',
      modele: '',
      matricule: '',
      annee: new Date().getFullYear(),
      statut: 'Disponible',
      consommation: undefined,
      assurance_date: undefined,
      visite_technique_date: undefined,
      vignette_date: undefined
    };
    this.selectedVehicle = this.newVehicle;
    this.showModal = true;
  }

  openActionModal(vehicle: Vehicle, mode: 'view' | 'edit' | 'delete'): void {
    this.modalMode = mode;
    this.selectedVehicle = { ...vehicle };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedVehicle = null;
  }

  saveVehicleChanges(): void {
    if (!this.selectedVehicle) return;

    if (this.modalMode === 'create') {
      this.vehicleService.create(this.selectedVehicle).subscribe({
        next: (created) => {
          this.vehicles.unshift(created);
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          alert('Erreur: ' + (err.error?.message || 'Impossible de créer'));
        }
      });
    } else {
      if (!this.selectedVehicle.id) return;
      this.vehicleService.update(this.selectedVehicle.id, this.selectedVehicle).subscribe({
        next: (updated) => {
          const idx = this.vehicles.findIndex(v => v.id === updated.id);
          if (idx !== -1) this.vehicles[idx] = updated;
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          alert('Erreur: ' + (err.error?.message || 'Impossible de mettre à jour'));
        }
      });
    }
  }

  deleteVehicle(id: number): void {
    this.vehicleService.delete(id).subscribe({
      next: () => {
        this.vehicles = this.vehicles.filter(v => v.id !== id);
        this.closeModal();
      },
      error: (err) => console.error('Erreur suppression:', err)
    });
  }

  exportToCSV(): void {
    if (this.vehicles.length === 0) return;

    const headers = ['ID', 'Marque', 'Modele', 'Matricule', 'Annee', 'Consommation', 'Assurance', 'Visite Tech', 'Vignette', 'Statut'];
    const rows = this.vehicles.map(v => [
      v.id,
      `"${v.marque}"`,
      `"${v.modele}"`,
      `"${v.matricule}"`,
      v.annee || '',
      `"${v.consommation || ''}"`,
      `"${v.assurance_date || ''}"`,
      `"${v.visite_technique_date || ''}"`,
      `"${v.vignette_date || ''}"`,
      `"${v.statut}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'vehicles_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.importing = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      this.parseCSVAndImport(e.target.result);
      event.target.value = '';
    };
    reader.onerror = () => {
      console.error('Error reading');
      this.importing = false;
    };
    reader.readAsText(file);
  }

  formatDateForDb(dateStr: string): string | undefined {
    if (!dateStr || dateStr.trim() === '') return undefined;

    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Handle MM/DD/YYYY or DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let mm = parts[0].padStart(2, '0');
      let dd = parts[1].padStart(2, '0');
      const yyyy = parts[2];

      // Heuristic: if first part > 12, it must be DD
      if (parseInt(mm) > 12) {
        const temp = mm;
        mm = dd;
        dd = temp;
      }

      return `${yyyy}-${mm}-${dd}`;
    }
    return undefined;
  }

  parseCSVAndImport(csvText: string): void {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
      alert('CSV invalide');
      this.importing = false;
      return;
    }

    // Clean headers: remove quotes, trim, lowercase
    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());
    console.log('Detected headers:', headers);

    const iMarq = headers.findIndex(h => h.includes('marque'));
    const iMod = headers.findIndex(h => h.includes('modèle') || h.includes('modele'));
    const iMat = headers.findIndex(h => h.includes('matricule'));
    const iAn = headers.findIndex(h => h.includes('ann'));
    const iCons = headers.findIndex(h => h.includes('conso'));
    const iAssu = headers.findIndex(h => h.includes('assur'));
    const iVisit = headers.findIndex(h => h.includes('visit') || h.includes('tech'));
    const iVign = headers.findIndex(h => h.includes('vign'));

    if (iMarq === -1 || iMod === -1 || iMat === -1) {
      alert('Le CSV doit au moins contenir: Marque, Modele, Matricule');
      this.importing = false;
      return;
    }

    const promises: Promise<void>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      if (cols.length < 3) continue;

      const marque = cols[iMarq];
      const modele = cols[iMod];
      const matricule = cols[iMat];

      if (!marque || !modele || !matricule) continue;

      const payload: any = {
        marque,
        modele,
        matricule,
        annee: iAn !== -1 && cols[iAn] ? parseInt(cols[iAn]) : undefined,
        consommation: iCons !== -1 ? cols[iCons] : undefined,
        assurance_date: iAssu !== -1 ? this.formatDateForDb(cols[iAssu]) : undefined,
        visite_technique_date: iVisit !== -1 ? this.formatDateForDb(cols[iVisit]) : undefined,
        vignette_date: iVign !== -1 ? this.formatDateForDb(cols[iVign]) : undefined,
        statut: 'Disponible'
      };

      const p = new Promise<void>(resolve => {
        this.vehicleService.create(payload as Vehicle).subscribe({
          next: (created) => {
            this.vehicles.unshift(created);
            resolve();
          },
          error: (err) => {
            console.error('Erreur import ligne ' + i, err);
            resolve();
          }
        });
      });
      promises.push(p);
    }

    Promise.all(promises).then(() => {
      this.importing = false;
      this.loadVehicles(); // Reload to ensure everything is synced
      alert(`Import terminé! ${promises.length} véhicules traités.`);
    });
  }
}
