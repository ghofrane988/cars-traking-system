import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { ReservationService } from '../../../core/services/reservation.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompanySettingService } from '../../../core/services/company-setting.service';
import { Vehicle, calculateFuelNeeded } from '../../../shared/models/vehicle';
import { Employee } from '../../../shared/models/employee';
import { Reservation } from '../../../shared/models/reservation';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-nouvelle-reservation',
  templateUrl: './nouvelle-reservation.component.html',
  styleUrls: ['./nouvelle-reservation.component.css']
})
export class NouvelleReservationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  // Form data
  reservation: Reservation = {
    employee_id: 0,
    date_debut: '',
    mission: '',
    destination: '',
    requested_vehicle_type: 'passenger',
    status: 'pending',
    start_lat: 36.8065,  // Tunis default
    start_lng: 10.1815,
    end_lat: 36.8,
    end_lng: 10.18,
    estimated_distance: 0,
    estimated_duration: 0
  };

  // Map
  private map!: L.Map;
  private startMarker!: L.Marker;
  private endMarker!: L.Marker;
  private routeLine!: L.Polyline;

  // Data
  vehicles: Vehicle[] = [];
  currentUser: Employee | null = null;
  loading = false;
  calculatingRoute = false;
  minDate: string = '';

  // 🌍 Search Destination
  searchDestTerm = '';
  isSearchingDest = false;

  // Map config
  private tunisCoords: L.LatLngExpression = [36.8065, 10.1815];

  constructor(
    private reservationService: ReservationService,
    private vehicleService: VehicleService,
    private authService: AuthService,
    private companySettingService: CompanySettingService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.updateMinDate();
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.reservation.employee_id = user.id!;
      }
    });

    this.loadAvailableVehicles();
    this.loadParkingSettings();
  }

  updateMinDate(): void {
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm
    this.minDate = now.toISOString().slice(0, 16);
  }

  loadParkingSettings(): void {
    this.companySettingService.getSettings().subscribe(settings => {
      if (settings && settings.parking_lat) {
        this.reservation.start_lat = settings.parking_lat;
        this.reservation.start_lng = settings.parking_lng;
        if (this.startMarker) {
          this.startMarker.setLatLng([settings.parking_lat, settings.parking_lng]);
          this.calculateRoute();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit called');
    // Longer delay to ensure DOM is fully rendered
    setTimeout(() => {
      console.log('Timeout elapsed, calling initMap');
      this.initMap();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    console.log('InitMap called, mapContainer:', this.mapContainer);
    if (!this.mapContainer) {
      console.error('Map container not found!');
      return;
    }

    const container = this.mapContainer.nativeElement;
    console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);

    // Ensure container has dimensions - critical for Leaflet
    if (container.offsetHeight === 0 || container.offsetWidth === 0) {
      console.warn('Container has 0 size, forcing dimensions');
      container.style.height = '400px';
      container.style.width = '100%';
    }

    // Initialize map centered on Tunis
    this.map = L.map(container, {
      center: this.tunisCoords,
      zoom: 13
    });
    console.log('Map initialized:', this.map);

    // Add CartoDB Voyager tiles FIRST
    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      maxZoom: 19,
      crossOrigin: true
    }).addTo(this.map);

    console.log('Tile layer added');

    // THEN invalidate size after tiles are added - CRITICAL!
    setTimeout(() => {
      console.log('Forcing map redraw...');
      this.map.invalidateSize(true);
      this.map.setView(this.tunisCoords, 13, { animate: false });
      console.log('Map redrawn');
    }, 200);


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

    // Add start marker
    this.startMarker = L.marker([this.reservation.start_lat!, this.reservation.start_lng!], {
      draggable: true,
      icon: startIcon
    }).addTo(this.map);

    this.startMarker.bindPopup('Point de départ').openPopup();

    // Add end marker
    this.endMarker = L.marker([this.reservation.end_lat!, this.reservation.end_lng!], {
      draggable: true,
      icon: endIcon
    }).addTo(this.map);

    this.endMarker.bindPopup('Point d\'arrivée').openPopup();

    // Event listeners for marker drag
    this.startMarker.on('dragend', () => {
      const pos = this.startMarker.getLatLng();
      this.reservation.start_lat = pos.lat;
      this.reservation.start_lng = pos.lng;
      this.calculateRoute();
    });

    this.endMarker.on('dragend', () => {
      const pos = this.endMarker.getLatLng();
      this.reservation.end_lat = pos.lat;
      this.reservation.end_lng = pos.lng;
      this.calculateRoute();
    });

    // Initial route calculation
    this.calculateRoute();
  }

  loadAvailableVehicles(): void {
    this.vehicleService.getAll().subscribe({
      next: (vehicles: Vehicle[]) => {
        // Filter available vehicles
        this.vehicles = vehicles.filter((v: Vehicle) => v.statut?.toLowerCase() === 'disponible');
      },
      error: (err: any) => {
        console.error('Error loading vehicles:', err);
        alert('Erreur lors du chargement des véhicules');
      }
    });
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

          this.reservation.end_lat = lat;
          this.reservation.end_lng = lon;
          this.reservation.destination = res.display_name;

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
    if (!this.reservation.start_lat || !this.reservation.start_lng ||
      !this.reservation.end_lat || !this.reservation.end_lng) {
      return;
    }

    this.calculatingRoute = true;

    const url = `${environment.apiUrl}/gps/calculate-route`;
    const body = {
      start_lat: this.reservation.start_lat,
      start_lng: this.reservation.start_lng,
      end_lat: this.reservation.end_lat,
      end_lng: this.reservation.end_lng
    };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        this.reservation.estimated_distance = response.distance_km;
        this.reservation.estimated_duration = response.duration_min;

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
        this.reservation.estimated_distance = distance;
        this.reservation.estimated_duration = Math.round((distance / 60) * 60);
        this.calculatingRoute = false;
      }
    });
  }

  private calculateStraightLineDistance(): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(this.reservation.end_lat! - this.reservation.start_lat!);
    const dLon = this.deg2rad(this.reservation.end_lng! - this.reservation.start_lng!);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this.reservation.start_lat!)) *
      Math.cos(this.deg2rad(this.reservation.end_lat!)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  onSubmit(): void {
    console.log('onSubmit called!');
    console.log('Current reservation:', this.reservation);

    if (!this.validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form valid, submitting...');
    this.loading = true;

    this.reservationService.create(this.reservation).subscribe({
      next: (response) => {
        console.log('Reservation created successfully:', response);
        this.loading = false;
        alert('Réservation créée avec succès !');
        this.router.navigate(['/mes-reservations']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error creating reservation:', err);
        alert('Erreur lors de la création de la réservation: ' + (err.message || 'Erreur inconnue'));
      }
    });
  }

  private validateForm(): boolean {
    this.updateMinDate();

    if (!this.reservation.date_debut) {
      alert('Veuillez sélectionner une date de début');
      return false;
    }

    if (this.reservation.date_debut < this.minDate) {
      alert('La date de début ne peut pas être dans le passé');
      return false;
    }

    if (this.reservation.date_fin && this.reservation.date_fin < this.reservation.date_debut) {
      alert('La date de fin doit être après la date de début');
      return false;
    }

    if (!this.reservation.mission) {
      alert('Veuillez indiquer la mission');
      return false;
    }
    if (!this.reservation.destination) {
      alert('Veuillez indiquer la destination');
      return false;
    }
    return true;
  }

  resetForm(): void {
    this.reservation = {
      employee_id: this.currentUser?.id || 0,
      date_debut: '',
      date_fin: '',
      mission: '',
      destination: '',
      requested_vehicle_type: 'passenger',
      status: 'pending',
      start_lat: 36.8065,
      start_lng: 10.1815,
      end_lat: 36.8,
      end_lng: 10.18,
      estimated_distance: 0,
      estimated_duration: 0
    };

    // Reset markers
    if (this.startMarker && this.endMarker) {
      this.startMarker.setLatLng([36.8065, 10.1815]);
      this.endMarker.setLatLng([36.8, 10.18]);
    }

    this.calculateRoute();
  }

  getDurationText(): string {
    const mins = this.reservation.estimated_duration || 0;
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

  // Calculate estimated fuel needed based on average consumption (7L/100km)
  getEstimatedFuel(): number {
    const distance = this.reservation.estimated_distance || 0;
    const avgConsumption = 7; // L/100km average
    return calculateFuelNeeded(distance, avgConsumption);
  }

  // Get fuel cost estimation (approximate price: 2.5 TND/L)
  getEstimatedFuelCost(): number {
    const fuelLiters = this.getEstimatedFuel();
    const pricePerLiter = 2.5; // TND
    return Math.round(fuelLiters * pricePerLiter * 100) / 100;
  }
}
