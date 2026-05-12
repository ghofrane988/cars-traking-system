import { Component, OnInit } from '@angular/core';
import { ReservationService } from '../../../core/services/reservation.service';
import { GpsService, LatLng } from '../../../core/services/gps.service';
import { Reservation } from '../../../shared/models/reservation';

@Component({
  selector: 'app-trip-history',
  templateUrl: './trip-history.component.html',
  styleUrls: ['./trip-history.component.css']
})
export class TripHistoryComponent implements OnInit {
  completedReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  fallbackPoints: LatLng[] | undefined = undefined;
  loading = true;
  error = '';

  constructor(
    private reservationService: ReservationService,
    private gpsService: GpsService
  ) { }

  ngOnInit(): void {
    this.loadCompletedReservations();
  }

  loadCompletedReservations(): void {
    this.loading = true;
    this.reservationService.getAll({ status: 'completed' }).subscribe({
      next: (reservations) => {
        this.completedReservations = reservations;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des trajets';
        this.loading = false;
        console.error(err);
      }
    });
  }

  viewTrip(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.fallbackPoints = this.buildFallbackPoints(reservation);
  }

  private buildFallbackPoints(res: Reservation): LatLng[] | undefined {
    const points: LatLng[] = [];
    if (res.start_lat != null && res.start_lng != null) {
      points.push({ lat: res.start_lat, lng: res.start_lng });
    }
    if (res.end_lat != null && res.end_lng != null) {
      points.push({ lat: res.end_lat, lng: res.end_lng });
    }
    return points.length >= 2 ? points : undefined;
  }

  onRouteCalculated(event: { distance: number; path: any[] }): void {
    console.log('Distance calculée:', event.distance, 'km');
  }
}
