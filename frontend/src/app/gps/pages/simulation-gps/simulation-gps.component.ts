import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GpsService } from '../../../core/services/gps.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { Vehicle } from '../../../shared/models/vehicle';
import { GpsLocation } from '../../../shared/models/gps-location';

interface Alert {
    type: string;
    severity: 'warning' | 'info';
    message: string;
}

interface DistanceMetrics {
    estimated_distance_km: number;
    actual_distance_km: number;
    difference_km: number;
    percentage_difference: number;
    is_exceeded: boolean;
    alert?: Alert;
}

@Component({
    selector: 'app-simulation-gps',
    templateUrl: './simulation-gps.component.html',
    styleUrls: ['./simulation-gps.component.css']
})
export class SimulationGpsComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    // 🚗 Vehicle & Tracking
    vehicles: Vehicle[] = [];
    selectedVehicleId: number | null = null;
    isTracking = false;
    isLoading = false;

    // 📍 Position Data
    currentPosition: any = null;
    positionHistory: GpsLocation[] = [];
    currentReservation: any = null;

    // 📊 Distance Metrics
    distanceMetrics: DistanceMetrics | null = null;

    // 🔔 Alert
    alert: Alert | null = null;

    // 🗺️ Map
    private map: L.Map | null = null;
    private marker: L.Marker | null = null;
    private pathLine: L.Polyline | null = null;
    private positionMarkers: L.Marker[] = [];

    // ⏱️ Subscriptions
    private dataSubscription: Subscription | null = null;
    private statusSubscription: Subscription | null = null;

    // 🌍 Tunis coordinates (default)
    private tunisCoords: L.LatLngTuple = [36.8065, 10.1815];
    
    // 🗓️ Active Reservations
    activeReservations: any[] = [];
    plannedRouteLine: L.Polyline | null = null;
    startMarker: L.Marker | null = null;
    endMarker: L.Marker | null = null;

    constructor(
        private gpsService: GpsService,
        private vehicleService: VehicleService,
        private reservationService: ReservationService,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        this.loadActiveReservations();
        this.subscribeToTracking();
    }

    subscribeToTracking(): void {
        // Sync with service state
        this.statusSubscription = this.gpsService.isTrackingActive$.subscribe(active => {
            this.isTracking = active;
        });

        this.dataSubscription = this.gpsService.trackingData$.subscribe(data => {
            if (!data) return;

            this.ngZone.run(() => {
                // If reservation changed or we just entered the page, load the full history
                if (data.reservation && (!this.currentReservation || this.currentReservation.id !== data.reservation.id || this.positionHistory.length === 0)) {
                    this.currentReservation = data.reservation;
                    this.loadReservationHistory(data.reservation.id);
                }

                this.currentPosition = data;
                this.selectedVehicleId = data.reservation?.vehicle_id || this.selectedVehicleId;

                this.updateMapPosition(data.position);
                this.addToHistory(data.position);

                if (data.reservation) {
                    this.checkDistanceAlert(data.reservation.id);
                }
            });
        });
    }

    ngAfterViewInit(): void {
        this.initMap();
    }

    ngOnDestroy(): void {
        // We do NOT stop the tracking here, as the user wants it to continue in the background
        if (this.dataSubscription) this.dataSubscription.unsubscribe();
        if (this.statusSubscription) this.statusSubscription.unsubscribe();
        
        if (this.map) {
            this.map.remove();
        }
    }

    // ==========================
    // 📅 RESERVATION MANAGEMENT
    // ==========================

    loadActiveReservations(): void {
        this.isLoading = true;
        this.reservationService.getAll({ status: 'approved' }).subscribe({
            next: (reservations: any[]) => {
                // Add in_progress as well if any
                this.reservationService.getAll({ status: 'in_progress' }).subscribe({
                    next: (inProgress: any[]) => {
                        this.activeReservations = [...reservations, ...inProgress];
                        this.isLoading = false;
                    }
                });
            },
            error: (err: any) => {
                console.error('Error loading reservations:', err);
                this.isLoading = false;
            }
        });
    }

    selectReservation(reservation: any): void {
        this.stopTracking(); // Stop any existing tracking
        this.currentReservation = reservation;
        this.selectedVehicleId = reservation.vehicle_id;
        
        // Tell backend that the mobile app simulation should use this vehicle
        this.gpsService.setSimulationTarget(reservation.vehicle_id)
            .subscribe({
                next: () => console.log('Simulation target synced with backend:', reservation.vehicle_id),
                error: (err) => console.error('Failed to sync simulation target', err)
            });
        
        this.initMap();
        this.drawPlannedRoute(reservation);
        this.startTracking();
    }
    
    drawPlannedRoute(reservation: any): void {
        // Ensure map is initialized before drawing
        if (!this.map) {
            setTimeout(() => this.drawPlannedRoute(reservation), 400);
            return;
        }
        
        // Remove old planned route and markers
        if (this.plannedRouteLine) this.map.removeLayer(this.plannedRouteLine);
        if (this.startMarker) this.map.removeLayer(this.startMarker);
        if (this.endMarker) this.map.removeLayer(this.endMarker);

        const startLat = reservation.start_lat || 36.8065;
        const startLng = reservation.start_lng || 10.1815;
        const endLat = reservation.end_lat;
        const endLng = reservation.end_lng;

        if (endLat && endLng) {
            // Create nice styled markers exactly like the photo
            const startIcon = L.divIcon({ 
                className: 'route-marker start-marker', 
                html: '<div style="background:#4338ca; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>', 
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            const endIcon = L.divIcon({ 
                className: 'route-marker end-marker', 
                html: '<div style="background:#4338ca; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3); display:flex; justify-content:center; align-items:center;"><div style="background:white; width:6px; height:6px; border-radius:50%;"></div></div>', 
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            this.startMarker = L.marker([startLat, startLng], { icon: startIcon }).addTo(this.map)
                .bindTooltip(`<div style="font-weight:bold; color:#1f2937;">Point de départ</div><div style="color:#6b7280; font-size:12px;">${reservation.mission}</div>`, { permanent: true, direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
                
            this.endMarker = L.marker([endLat, endLng], { icon: endIcon }).addTo(this.map)
                .bindTooltip(`<div style="font-weight:bold; color:#1f2937;">Destination</div><div style="color:#6b7280; font-size:12px;">${reservation.destination || 'Point d\'arrivée'}</div>`, { permanent: true, direction: 'top', offset: [0, -10], className: 'custom-tooltip' });

            // Fetch Route from OSRM via backend
            this.gpsService.calculateRoute(startLat, startLng, endLat, endLng).subscribe({
                next: (res: any) => {
                    if (res.geometry) {
                        // GeoJSON
                        if (typeof res.geometry === 'object' && res.geometry.coordinates) {
                            const latLngs = res.geometry.coordinates.map((coord: any) => [coord[1], coord[0]] as L.LatLngTuple);
                            this.plannedRouteLine = L.polyline(latLngs, {
                                color: '#4338ca', // Solid Indigo Blue like the photo
                                weight: 5,
                                opacity: 0.9,
                                lineJoin: 'round'
                            }).addTo(this.map!);
                            this.map!.fitBounds(this.plannedRouteLine.getBounds(), { padding: [50, 50] });
                        }
                    } else {
                        // Fallback: straight line
                        this.plannedRouteLine = L.polyline([[startLat, startLng], [endLat, endLng]], {
                            color: '#4338ca', weight: 5, opacity: 0.9, lineJoin: 'round'
                        }).addTo(this.map!);
                        this.map!.fitBounds(this.plannedRouteLine.getBounds(), { padding: [50, 50] });
                    }
                }
            });
        } else {
            // If no destination, just show start
            const startIcon = L.divIcon({ 
                className: 'route-marker start-marker', 
                html: '<div style="background:#4338ca; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>', 
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            this.startMarker = L.marker([startLat, startLng], { icon: startIcon }).addTo(this.map)
                .bindTooltip(`<div style="font-weight:bold; color:#1f2937;">Point de départ</div>`, { permanent: true, direction: 'top', offset: [0, -10], className: 'custom-tooltip' });
            this.map.setView([startLat, startLng], 14);
        }
    }

    // ==========================
    // 🎮 TRACKING CONTROLS
    // ==========================

    startTracking(): void {
        if (!this.selectedVehicleId) return;
        this.gpsService.startTracking(this.selectedVehicleId, this.currentReservation);
        this.initMap();
    }

    stopTracking(): void {
        this.gpsService.stopTracking();
    }

    // ==========================
    // 📍 POSITION FETCHING
    // ==========================

    fetchCurrentPosition(): void {
        if (!this.selectedVehicleId) return;

        this.gpsService.getVehicleCurrentPosition(this.selectedVehicleId).subscribe({
            next: (data: any) => {
                this.currentPosition = data;
                
                // If reservation changed or we just started, load the full history
                if (data.reservation && (!this.currentReservation || this.currentReservation.id !== data.reservation.id || this.positionHistory.length === 0)) {
                    this.currentReservation = data.reservation;
                    this.loadReservationHistory(data.reservation.id);
                } else {
                    this.currentReservation = data.reservation;
                    // Just update map and add to history
                    this.updateMapPosition(data.position);
                    this.addToHistory(data.position);
                }

                // Check for alerts
                if (data.reservation) {
                    this.checkDistanceAlert(data.reservation.id);
                }
            },
            error: (err: any) => {
                // Ignore 404 errors (happens when a vehicle hasn't sent any GPS data yet)
                if (err.status !== 404) {
                    console.error('Error fetching position:', err);
                }
            }
        });
    }

    // ==========================
    // 🏁 FINISH MISSION
    // ==========================

    finishMission(): void {
        if (this.currentReservation && confirm("Trajet terminé ! Voulez-vous marquer cette mission comme achevée (Afin de l'enregistrer dans l'historique des trajets) ?")) {
            let totalKm = this.distanceMetrics ? this.distanceMetrics.actual_distance_km : (this.positionHistory.length > 0 ? (this.positionHistory[this.positionHistory.length - 1].distance_cumulative || 0) : 0);

            this.reservationService.return(this.currentReservation.id, totalKm).subscribe({
                next: () => {
                    this.showAlert('info', '✅ Trajet enregistré avec succès ! Il est maintenant disponible dans la page Historique des Trajets.');
                    this.stopTracking(); // Stop listening
                    this.positionHistory = []; // clear
                    this.currentReservation = null;
                    // Remove from list since it shouldn't be Affecté anymore
                    this.vehicles = this.vehicles.filter(v => v.id !== this.selectedVehicleId);
                    this.selectedVehicleId = null;
                    this.fetchCurrentPosition(); // will return empty since vehicleId is null
                },
                error: (err) => console.error('Erreur clôtrure', err)
            });
        }
    }

    addToHistory(position: any): void {
        // Prevent duplicate positions from polling
        if (this.positionHistory.length > 0) {
            const lastPos = this.positionHistory[this.positionHistory.length - 1];
            if (lastPos.latitude === position.latitude && lastPos.longitude === position.longitude) {
                return; // Do not add duplicate point
            }
        }

        const location: GpsLocation = {
            id: Date.now(),
            vehicle_id: this.selectedVehicleId!,
            reservation_id: this.currentReservation?.id,
            latitude: position.latitude,
            longitude: position.longitude,
            speed: position.speed,
            distance_cumulative: position.distance_cumulative,
            recorded_at: position.recorded_at,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Don't add if it's the exact same as the last one
        if (this.positionHistory.length > 0) {
            const last = this.positionHistory[this.positionHistory.length - 1];
            if (last.latitude === position.latitude && last.longitude === position.longitude) return;
        }

        this.positionHistory.push(location);

        // Keep only last 200 positions to avoid performance issues
        if (this.positionHistory.length > 200) {
            this.positionHistory.shift();
        }

        // Update path line on map
        this.updatePathLine();
    }

    loadReservationHistory(reservationId: number): void {
        this.gpsService.getByReservation(reservationId).subscribe({
            next: (locations: GpsLocation[]) => {
                if (locations && locations.length > 0) {
                    this.positionHistory = locations.slice(-200); // Get last 200 points
                    this.updatePathLine();
                    
                    // Put marker on the very last position
                    const lastPos = locations[locations.length - 1];
                    this.updateMapPosition(lastPos);
                }
            },
            error: (err: any) => console.error('Error loading history:', err)
        });
    }

    // ==========================
    // 📊 DISTANCE COMPARISON
    // ==========================

    compareDistance(): void {
        if (!this.currentReservation) {
            this.showAlert('info', 'Aucune réservation active pour ce véhicule');
            return;
        }

        this.gpsService.compareDistance(this.currentReservation.id).subscribe({
            next: (metrics: any) => {
                this.distanceMetrics = metrics;

                if (metrics.alert) {
                    this.alert = metrics.alert;
                }
            },
            error: (err: any) => {
                console.error('Error comparing distance:', err);
                this.showAlert('warning', 'Erreur lors de la comparaison des distances');
            }
        });
    }

    checkDistanceAlert(reservationId: number): void {
        this.gpsService.compareDistance(reservationId).subscribe({
            next: (metrics: any) => {
                this.distanceMetrics = metrics;

                if (metrics.alert && metrics.alert.severity === 'warning') {
                    this.alert = metrics.alert;
                }
            },
            error: (err: any) => {
                console.error('Error checking distance alert:', err);
            }
        });
    }

    // ==========================
    // 🗺️ MAP MANAGEMENT
    // ==========================

    initMap(): void {
        if (this.map) return;

        setTimeout(() => {
            if (!this.mapContainer) return;

            this.map = L.map(this.mapContainer.nativeElement).setView(this.tunisCoords, 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://carto.com/">CARTO</a> providers',
                maxZoom: 19
            }).addTo(this.map);

            // Sleek Modern Vehicle Marker with shadow and dynamic color
            const vehicleIcon = L.divIcon({
                className: 'modern-vehicle-marker',
                html: `
          <div class="marker-pin" style="background: #1e40af; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="marker-icon" style="font-size: 20px;">🚗</div>
          </div>
          <div class="marker-pulse" style="background: rgba(30, 64, 175, 0.4); border-radius: 50%; width: 60px; height: 60px; position: absolute; top: -10px; left: -10px; animation: pulse 1.5s infinite;"></div>
        `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            this.marker = L.marker(this.tunisCoords, { icon: vehicleIcon }).addTo(this.map);
        }, 300);
    }

    updateMapPosition(position: any): void {
        if (!this.map || !this.marker) return;

        const latLng: L.LatLngTuple = [position.latitude, position.longitude];

        // Update marker position
        this.marker.setLatLng(latLng);

        // Pan map to follow vehicle
        this.map.panTo(latLng);
    }

    updatePathLine(): void {
        if (!this.map || this.positionHistory.length < 2) return;

        // Remove old path
        if (this.pathLine) {
            this.map.removeLayer(this.pathLine);
        }

        // Create new path
        const latLngs = this.positionHistory.map(p => [p.latitude, p.longitude] as L.LatLngTuple);

        // Determine color based on deviation
        const isExceeded = this.distanceMetrics?.is_exceeded || false;
        const lineColor = isExceeded ? '#ef4444' : '#3b82f6'; // Red if exceeded, otherwise Blue

        this.pathLine = L.polyline(latLngs, {
            color: lineColor,
            weight: 5,
            opacity: 0.9,
            smoothFactor: 1.2,
            lineJoin: 'round',
            lineCap: 'round',
            dashArray: '10, 15' // Creates a distinct dashed line effect
        }).addTo(this.map);
    }

    // ==========================
    // 🔔 ALERT MANAGEMENT
    // ==========================

    showAlert(severity: 'warning' | 'info', message: string): void {
        this.alert = {
            type: 'manual',
            severity,
            message
        };
    }

    dismissAlert(): void {
        this.alert = null;
    }
}
