import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ReservationService } from '../../../core/services/reservation.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompanySettingService } from '../../../core/services/company-setting.service';
import { Reservation } from '../../../shared/models/reservation';
import { Vehicle, calculateFuelNeeded, hasEnoughFuel } from '../../../shared/models/vehicle';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reservation-list',
  templateUrl: './reservation-list.component.html',
  styleUrls: ['./reservation-list.component.css']
})
export class ReservationListComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  reservations: Reservation[] = [];
  vehicles: Vehicle[] = [];
  loading = false;
  error = '';
  isAdmin = false;
  isSuperAdmin = false;
  currentUserId: number | null = null;
  viewMode: 'list' | 'calendar' = 'list';
  calendarReservations: any[] = [];

  // 🚗 Vehicle assignment modal properties
  showAssignModal = false;
  selectedReservation: Reservation | null = null;
  selectedVehicle: Vehicle | null = null;
  availableVehicles: Vehicle[] = [];

  // 🚫 Cancel/Reject Modal
  showCancelModal = false;
  cancelReason = '';
  reservationToCancel: Reservation | null = null;
  cancelMode: 'cancel' | 'reject' = 'cancel';

  // Admin assignment map
  @ViewChild('assignMapContainer', { static: false }) assignMapContainer!: ElementRef;
  private assignMap!: L.Map;
  private assignRouteLine!: L.Polyline;

  // Expose helper functions to template
  calculateFuelNeeded = calculateFuelNeeded;
  hasEnoughFuel = hasEnoughFuel;

  // Getter for pending reservations
  get pendingReservations(): Reservation[] {
    return this.reservations.filter(r => r.status === 'pending');
  }

  // 🔍 Search properties
  searchTerm = '';
  filterStatus = '';
  filterDateDebut = '';
  filterDateFin = '';
  private searchTimeout: any;

  // New helpers for sidebar design
  get filteredReservations(): Reservation[] {
    return this.reservations;
  }

  newReservation: Partial<Reservation> = {
    vehicle_id: undefined,
    date_debut: '',
    date_fin: '',
    mission: '',
    destination: '',
    start_lat: 36.8065,
    start_lng: 10.1815,
    end_lat: 36.8,
    end_lng: 10.18,
    estimated_distance: 0,
    estimated_duration: 0
  };

  // Map properties
  private map!: L.Map;
  private startMarker!: L.Marker;
  private endMarker!: L.Marker;
  private routeLine!: L.Polyline;
  calculatingRoute = false;
  private tunisCoords: L.LatLngExpression = [36.8065, 10.1815];

  // 🌍 Search Destination
  searchDestTerm = '';
  isSearchingDest = false;

  constructor(
    private reservationService: ReservationService,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private companySettingService: CompanySettingService,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin() || this.authService.isResponsable();
    this.isSuperAdmin = this.authService.isAdmin();
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.id || null;

    if (this.router.url.includes('calendar')) {
      this.viewMode = 'calendar';
    }

    this.loadReservations();
    this.loadAvailableVehicles();
    this.loadParkingSettings();
  }

  loadParkingSettings(): void {
    this.companySettingService.getSettings().subscribe(settings => {
      if (settings && settings.parking_lat) {
        this.newReservation.start_lat = settings.parking_lat;
        this.newReservation.start_lng = settings.parking_lng;
        // Also update marker if map already init
        if (this.startMarker) {
          this.startMarker.setLatLng([settings.parking_lat, settings.parking_lng]);
          this.calculateRoute();
        }
      }
    });
  }

  loadReservations(searchParams?: any): void {
    this.loading = true;

    // Build search params
    let params: any = { ...searchParams };

    if (!this.isAdmin && this.currentUserId) {
      params.employee_id = this.currentUserId;
    }

    this.reservationService.getAll(params).subscribe({
      next: (data: Reservation[]) => {
        this.reservations = data;
        this.loading = false;
        if (this.viewMode === 'calendar') {
          this.loadCalendarData();
        }
      },
      error: (err: any) => {
        this.error = 'Erreur lors du chargement des réservations';
        this.loading = false;
        console.error(err);
      }
    });
  }

  loadCalendarData(): void {
    this.reservationService.getCalendar().subscribe({
      next: (events) => {
        this.calendarReservations = events;
      },
      error: (err) => console.error('Error loading calendar:', err)
    });
  }

  // 🔍 Search methods
  onSearch(): void {
    // Debounce search to avoid too many API calls
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      const params: any = {};

      if (this.searchTerm) {
        params.search = this.searchTerm;
      }
      if (this.filterStatus) {
        params.status = this.filterStatus;
      }
      if (this.filterDateDebut) {
        params.date_debut = this.filterDateDebut;
      }
      if (this.filterDateFin) {
        params.date_fin = this.filterDateFin;
      }

      this.loadReservations(params);
    }, 300); // 300ms debounce
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.loadReservations();
  }

  hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.filterStatus || !!this.filterDateDebut || !!this.filterDateFin;
  }

  loadAvailableVehicles(): void {
    this.vehicleService.getAll().subscribe({
      next: (data) => {
        this.vehicles = data.filter(v => v.statut === 'Disponible');
      },
      error: (err) => console.error(err)
    });
  }

  prepareCalendarData(): void {
    this.calendarReservations = this.reservations.map(r => ({
      title: `${r.vehicle?.marque} ${r.vehicle?.modele} - ${r.employee?.nom}`,
      start: r.date_debut,
      end: r.date_fin,
      status: r.status,
      extendedProps: r
    }));
  }

  createReservation(): void {
    if (!this.newReservation.date_debut || !this.newReservation.mission) {
      this.error = 'Veuillez remplir les champs obligatoires (date de début et mission)';
      return;
    }

    const reservationData = {
      employee_id: this.currentUserId,
      date_debut: this.newReservation.date_debut,
      date_fin: this.newReservation.date_fin || null,
      mission: this.newReservation.mission,
      destination: this.newReservation.destination || '',
      status: 'pending' as const
    };

    this.reservationService.create(reservationData as any).subscribe({
      next: () => {
        this.loadReservations();
        // Reset form
        this.newReservation = {
          vehicle_id: undefined,
          date_debut: '',
          date_fin: '',
          mission: '',
          destination: ''
        };
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la création de la réservation';
      }
    });
  }

  approveReservation(reservation: Reservation): void {
    console.log('Opening assign modal for reservation:', reservation);
    this.selectedReservation = reservation;
    this.selectedVehicle = null;
    this.showAssignModal = true;
    this.availableVehicles = [];

    // Calculate requested period
    const dateDebut = typeof reservation.date_debut === 'string' ? reservation.date_debut : (reservation.date_debut as Date).toISOString();
    let dateFin = '';

    if (reservation.date_fin) {
      dateFin = typeof reservation.date_fin === 'string' ? reservation.date_fin : (reservation.date_fin as Date).toISOString();
    } else {
      // Fallback: start + estimated duration + 1h buffer
      const startObj = new Date(dateDebut);
      const durationMin = reservation.estimated_duration || 120;
      const endObj = new Date(startObj.getTime() + (durationMin + 60) * 60000);
      dateFin = endObj.toISOString();
    }

    // Load ONLY vehicles available during this specific period
    this.vehicleService.getAvailableForPeriod(dateDebut, dateFin).subscribe({
      next: (vehicles) => {
        console.log('Loaded available vehicles for period:', vehicles);
        this.availableVehicles = vehicles.map(v => ({
          ...v,
          consommation: v.consommation || 7,
          type_carburant: v.type_carburant || 'Essence',
          capacite_reservoir: v.capacite_reservoir || 50
        }));
      },
      error: (err) => {
        console.error('Error loading available vehicles:', err);
        this.error = 'Erreur lors de la vérification des disponibilités';
      }
    });

    // Initialize map after modal opens
    setTimeout(() => {
      this.initAssignMap();
    }, 500);
  }

  closeAssignModal(): void {
    if (this.assignMap) {
      this.assignMap.remove();
      (this.assignMap as any) = null;
    }
    this.showAssignModal = false;
    this.selectedReservation = null;
    this.selectedVehicle = null;
    this.availableVehicles = [];
  }

  selectVehicle(vehicle: Vehicle): void {
    console.log('Selecting vehicle:', vehicle);
    this.selectedVehicle = vehicle;
    console.log('Selected vehicle:', this.selectedVehicle);
  }

  getVehicleStatusClass(status: string): string {
    switch (status) {
      case 'Disponible': return 'status-available';
      case 'Affecté': return 'status-assigned';
      case 'En maintenance': return 'status-maintenance';
      default: return '';
    }
  }

  onAffecterClick(): void {
    console.log('>>> onAffecterClick called');
    console.log('selectedReservation:', this.selectedReservation);
    console.log('selectedVehicle:', this.selectedVehicle);
    this.confirmAssignVehicle();
  }

  confirmAssignVehicle(): void {
    console.log('>>> confirmAssignVehicle called');
    if (!this.selectedReservation?.id || !this.selectedVehicle?.id) {
      console.error('Missing reservation ID or vehicle ID');
      alert('Veuillez sélectionner un véhicule');
      return;
    }

    console.log('Approving reservation:', this.selectedReservation.id, 'with vehicle:', this.selectedVehicle?.id);

    this.reservationService.approve(this.selectedReservation.id, this.selectedVehicle!.id).subscribe({
      next: (response) => {
        console.log('Approval successful:', response);
        const isUpdate = this.selectedReservation?.status === 'approved';
        this.closeAssignModal();
        // Force reload after short delay to ensure backend updated
        setTimeout(() => {
          this.loadReservations();
          console.log('Reservations reloaded');
        }, 300);

        const successMsg = isUpdate
          ? '✅ Véhicule mis à jour avec succès !'
          : '✅ Réservation approuvée et véhicule affecté avec succès !';
        alert(successMsg);
      },
      error: (err: any) => {
        console.error('>>> Approval error full:', err);
        console.error('>>> Error response:', err.error);
        console.error('>>> Error message:', err.message);
        console.error('>>> Error status:', err.status);
        this.error = err.error?.error || err.error?.message || 'Erreur lors de l\'approbation';
        alert('Erreur: ' + this.error);
      }
    });
  }

  rejectReservation(reservation: Reservation): void {
    this.reservationToCancel = reservation;
    this.cancelMode = 'reject';
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  returnVehicle(reservation: Reservation): void {
    const kmFin = prompt('Kilométrage de retour :');
    if (kmFin && reservation.id) {
      this.reservationService.return(reservation.id, parseInt(kmFin)).subscribe({
        next: () => this.loadReservations(),
        error: (err) => this.error = 'Erreur lors du retour du véhicule'
      });
    }
  }

  deleteReservation(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
      this.reservationService.delete(id).subscribe({
        next: () => this.loadReservations(),
        error: (err) => this.error = 'Erreur lors de la suppression'
      });
    }
  }

  cancelReservation(id: number): void {
    const reservation = this.reservations.find(r => r.id === id);
    if (reservation) {
      this.reservationToCancel = reservation;
      this.cancelMode = 'cancel';
      this.cancelReason = '';
      this.showCancelModal = true;
    }
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.reservationToCancel = null;
    this.cancelReason = '';
  }

  confirmCancel(): void {
    if (!this.reservationToCancel?.id) return;

    this.loading = true;
    const obs = this.cancelMode === 'cancel'
      ? this.reservationService.cancel(this.reservationToCancel.id, this.cancelReason)
      : this.reservationService.reject(this.reservationToCancel.id, this.cancelReason);

    obs.subscribe({
      next: () => {
        this.loading = false;
        this.loadReservations();
        this.closeCancelModal();
        const msg = this.cancelMode === 'cancel' ? 'annulée' : 'refusée';
        alert(`✅ Réservation ${msg} avec succès !`);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Erreur lors de l\'opération';
        alert(this.error);
      }
    });
  }

  hasStarted(reservation: Reservation): boolean {
    if (!reservation.date_debut) return false;
    const start = new Date(reservation.date_debut);
    return start < new Date();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'cancelled': return 'status-cancelled';
      case 'in_progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  }

  setViewMode(mode: 'list' | 'calendar'): void {
    this.viewMode = mode;
    if (mode === 'calendar') {
      this.loadCalendarData();
    }
  }

  // 🗺️ MAP METHODS
  ngAfterViewInit(): void {
    if (!this.isAdmin && !this.authService.isResponsable()) {
      setTimeout(() => {
        this.initMap();
      }, 100);
    }
  }

  private initMap(): void {
    if (!this.mapContainer) return;

    // Initialize map centered on Tunis
    this.map = L.map(this.mapContainer.nativeElement).setView(this.tunisCoords, 13);

    // Add CartoDB Voyager tiles (Modern & Clean)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(this.map);

    // Custom modern markers
    const startIcon = L.divIcon({
      className: 'modern-dot-marker',
      html: '<div class="dot-pin green"><span>D</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const endIcon = L.divIcon({
      className: 'modern-dot-marker',
      html: '<div class="dot-pin red"><span>A</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // Add start marker
    this.startMarker = L.marker([this.newReservation.start_lat || 36.8065, this.newReservation.start_lng || 10.1815], {
      draggable: true,
      icon: startIcon
    }).addTo(this.map);

    this.startMarker.bindPopup('Point de départ').openPopup();

    // Add end marker
    this.endMarker = L.marker([this.newReservation.end_lat || 36.8, this.newReservation.end_lng || 10.18], {
      draggable: true,
      icon: endIcon
    }).addTo(this.map);

    this.endMarker.bindPopup('Point d\'arrivée').openPopup();

    // Event listeners for marker drag
    this.startMarker.on('dragend', () => {
      const pos = this.startMarker.getLatLng();
      this.newReservation.start_lat = pos.lat;
      this.newReservation.start_lng = pos.lng;
      this.calculateRoute();
    });

    this.endMarker.on('dragend', () => {
      const pos = this.endMarker.getLatLng();
      this.newReservation.end_lat = pos.lat;
      this.newReservation.end_lng = pos.lng;
      this.calculateRoute();
    });

    // Initial route calculation
    this.calculateRoute();

    // Fix map rendering issue
    setTimeout(() => {
      this.map.invalidateSize();
    }, 500);
  }

  searchDestination(): void {
    if (!this.searchDestTerm) return;
    this.isSearchingDest = true;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchDestTerm)}`;
    this.http.get<any[]>(url).subscribe({
      next: (results) => {
        if (results && results.length > 0) {
          const res = results[0];
          const lat = parseFloat(res.lat);
          const lon = parseFloat(res.lon);

          this.newReservation.end_lat = lat;
          this.newReservation.end_lng = lon;
          this.newReservation.destination = res.display_name;

          if (this.endMarker) {
            this.endMarker.setLatLng([lat, lon]);
            this.map.setView([lat, lon], 14);
          }
          this.calculateRoute();
        }
        this.isSearchingDest = false;
      },
      error: () => this.isSearchingDest = false
    });
  }

  calculateRoute(): void {
    if (!this.newReservation.start_lat || !this.newReservation.start_lng ||
      !this.newReservation.end_lat || !this.newReservation.end_lng) {
      return;
    }

    this.calculatingRoute = true;

    const url = `${environment.apiUrl}/gps/calculate-route`;
    const body = {
      start_lat: this.newReservation.start_lat,
      start_lng: this.newReservation.start_lng,
      end_lat: this.newReservation.end_lat,
      end_lng: this.newReservation.end_lng
    };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        this.newReservation.estimated_distance = response.distance_km;
        this.newReservation.estimated_duration = response.duration_min;

        // Draw route on map if geometry available
        if (response.geometry && this.map) {
          if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
          }

          const coords = response.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          this.routeLine = L.polyline(coords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7
          }).addTo(this.map);

          // Fit map to show entire route
          this.map.fitBounds(this.routeLine.getBounds(), { padding: [50, 50] });
        }

        this.calculatingRoute = false;
      },
      error: (err) => {
        console.error('Error calculating route:', err);
        // Fallback to straight-line distance
        const distance = this.calculateStraightLineDistance();
        this.newReservation.estimated_distance = distance;
        this.newReservation.estimated_duration = Math.round((distance / 60) * 60);
        this.calculatingRoute = false;
      }
    });
  }

  private calculateStraightLineDistance(): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad((this.newReservation.end_lat || 0) - (this.newReservation.start_lat || 0));
    const dLon = this.deg2rad((this.newReservation.end_lng || 0) - (this.newReservation.start_lng || 0));
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this.newReservation.start_lat || 0)) *
      Math.cos(this.deg2rad(this.newReservation.end_lat || 0)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  getDurationText(): string {
    const mins = this.newReservation.estimated_duration || 0;
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMins}min`;
  }

  // 🗺️ ADMIN ASSIGNMENT MAP METHODS
  initAssignMap(): void {
    console.log('initAssignMap called, container:', this.assignMapContainer, 'reservation:', this.selectedReservation);
    if (!this.assignMapContainer || !this.selectedReservation) {
      console.warn('Cannot init map: missing container or reservation');
      return;
    }

    // Clean up existing map if any
    if (this.assignMap) {
      this.assignMap.remove();
    }

    const res = this.selectedReservation;
    const startLat = res.start_lat || 36.8065;
    const startLng = res.start_lng || 10.1815;
    const endLat = res.end_lat || 36.8;
    const endLng = res.end_lng || 10.18;

    try {
      // Initialize map
      this.assignMap = L.map(this.assignMapContainer.nativeElement).setView([startLat, startLng], 13);

      // Add CartoDB Voyager tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
      }).addTo(this.assignMap);

      // Custom modern dots
      const startIcon = L.divIcon({
        className: 'modern-dot-marker',
        html: '<div class="dot-pin green"><span>D</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const endIcon = L.divIcon({
        className: 'modern-dot-marker',
        html: '<div class="dot-pin red"><span>A</span></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Add markers
      const destinationText = res.destination || 'Destination';
      L.marker([startLat, startLng], { icon: startIcon }).addTo(this.assignMap)
        .bindPopup('Départ');

      L.marker([endLat, endLng], { icon: endIcon }).addTo(this.assignMap)
        .bindPopup('Arrivée: ' + destinationText);

      // Draw route if we have distance
      if (res.estimated_distance && res.estimated_distance > 0) {
        this.drawAssignRoute(startLat, startLng, endLat, endLng);
      }

      // Fix map size with multiple delays to ensure container is ready
      setTimeout(() => this.assignMap.invalidateSize(), 100);
      setTimeout(() => this.assignMap.invalidateSize(), 500);

    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
    }
  }

  private drawAssignRoute(startLat: number, startLng: number, endLat: number, endLng: number): void {
    const url = `${environment.apiUrl}/gps/calculate-route`;
    const body = { start_lat: startLat, start_lng: startLng, end_lat: endLat, end_lng: endLng };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        if (response.geometry && this.assignMap) {
          const coords = response.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          this.assignRouteLine = L.polyline(coords, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7
          }).addTo(this.assignMap);
          this.assignMap.fitBounds(this.assignRouteLine.getBounds(), { padding: [50, 50] });
        }
      },
      error: () => {
        // Draw straight line as fallback
        this.assignRouteLine = L.polyline([[startLat, startLng], [endLat, endLng]], {
          color: '#3b82f6', weight: 3, opacity: 0.5, dashArray: '10, 10'
        }).addTo(this.assignMap);
      }
    });
  }

  assignVehicle(): void {
    if (!this.selectedVehicle || !this.selectedReservation) return;

    const distance = this.selectedReservation.estimated_distance || 0;
    const consumption = this.selectedVehicle.consommation || 7;
    const fuelNeeded = calculateFuelNeeded(distance, consumption);

    console.log('Fuel calculation:', { distance, consumption, fuelNeeded });

    alert(`✅ Véhicule ${this.selectedVehicle.marque} ${this.selectedVehicle.modele} affecté!\n` +
      `📍 Distance: ${distance.toFixed(1)} km\n` +
      `⛽ Carburant estimé: ${fuelNeeded} L\n` +
      `🔧 Consommation: ${consumption} L/100km`);

    this.closeAssignModal();
  }
}
