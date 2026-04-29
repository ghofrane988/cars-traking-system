import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { GpsService, LatLng } from '../../../core/services/gps.service';
import { GpsLocation } from '../../models/gps-location';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() reservationId?: number;
  @Input() showTracking = false;
  @Output() routeCalculated = new EventEmitter<{ distance: number; path: LatLng[] }>();

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private polyline: L.Polyline | null = null;
  private watchId: number | null = null;

  currentPosition: LatLng | null = null;
  trackedPoints: LatLng[] = [];
  totalDistance = 0;
  isTracking = false;

  constructor(private gpsService: GpsService) { }

  ngOnInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    this.stopTracking();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!this.mapContainer) return;

    // Initialize Leaflet map
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [36.8065, 10.1815],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Load existing GPS locations if reservationId provided
    if (this.reservationId) {
      this.loadRoute(this.reservationId);
    }

    // Get current position
    this.gpsService.getCurrentPosition()
      .then(position => {
        const { latitude, longitude } = position.coords;
        this.currentPosition = { lat: latitude, lng: longitude };
        this.map?.setView([latitude, longitude], 15);
        this.addMarker(latitude, longitude, 'Votre position', 'blue');
      })
      .catch(err => console.log('Geolocation error:', err));
  }

  private loadRoute(reservationId: number): void {
    this.gpsService.getByReservation(reservationId).subscribe({
      next: (locations) => {
        if (locations.length > 0) {
          const points: LatLng[] = locations.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude
          }));
          this.displayRoute(points);
        } else {
          // No GPS data - show default view
          this.totalDistance = 0;
        }
        // Force map redraw
        setTimeout(() => this.map?.invalidateSize(), 200);
      },
      error: (err) => {
        console.error('Error loading route:', err);
        this.totalDistance = 0;
      }
    });
  }

  private displayRoute(points: LatLng[]): void {
    if (!this.map || points.length === 0) return;

    // Clear existing
    this.clearMarkers();
    if (this.polyline) {
      this.map.removeLayer(this.polyline);
    }

    // Add markers
    points.forEach((point, index) => {
      const color = index === 0 ? 'green' : index === points.length - 1 ? 'red' : 'blue';
      const label = index === 0 ? 'Départ' : index === points.length - 1 ? 'Arrivée' : `Point ${index + 1}`;
      this.addMarker(point.lat, point.lng, label, color);
    });

    // Draw polyline
    this.polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
      color: '#6a1b9a',
      weight: 4,
      opacity: 0.8
    }).addTo(this.map);

    // Fit bounds
    this.map.fitBounds(this.polyline.getBounds());

    // Calculate distance
    this.totalDistance = this.gpsService.calculateRouteDistance(points);
    this.routeCalculated.emit({ distance: this.totalDistance, path: points });
  }

  private addMarker(lat: number, lng: number, label: string, color: string): void {
    if (!this.map) return;

    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12]
    });

    const marker = L.marker([lat, lng], { icon: customIcon })
      .addTo(this.map)
      .bindPopup(label);

    this.markers.push(marker);
  }

  private clearMarkers(): void {
    this.markers.forEach(marker => {
      if (this.map) {
        marker.removeFrom(this.map);
      }
    });
    this.markers = [];
  }

  // Start real-time tracking
  startTracking(): void {
    if (this.isTracking) return;

    this.isTracking = true;
    this.trackedPoints = [];

    try {
      this.watchId = this.gpsService.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        const point: LatLng = { lat: latitude, lng: longitude };

        this.trackedPoints.push(point);
        this.currentPosition = point;

        // Update map
        if (this.map) {
          this.map.setView([latitude, longitude], 16);
        }

        // Update route display
        if (this.trackedPoints.length > 1) {
          this.displayRoute(this.trackedPoints);
        }

        // Save to backend
        if (this.reservationId) {
          this.saveLocation(point);
        }
      });
    } catch (err) {
      console.error('Tracking error:', err);
      this.isTracking = false;
    }
  }

  // Stop tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      this.gpsService.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  private saveLocation(point: LatLng): void {
    if (!this.reservationId) return;

    const location: GpsLocation = {
      reservation_id: this.reservationId,
      latitude: point.lat,
      longitude: point.lng,
      timestamp: new Date()
    };

    this.gpsService.create(location).subscribe({
      error: (err) => console.error('Error saving location:', err)
    });
  }

  // Add destination point and calculate route
  addDestination(lat: number, lng: number): void {
    if (!this.currentPosition) return;

    const destination: LatLng = { lat, lng };
    const route = [this.currentPosition, destination];

    this.displayRoute(route);

    // Save destination
    if (this.reservationId) {
      this.saveLocation(destination);
    }
  }
}
