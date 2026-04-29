import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GpsLocation } from '../../shared/models/gps-location';

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RouteInfo {
    distance: number; // in km
    duration: number; // in minutes
    path: LatLng[];
}

@Injectable({
    providedIn: 'root'
})
export class GpsService {
    private apiUrl = `${environment.apiUrl}/gps-locations`;

    constructor(private http: HttpClient) { }

    getAll(): Observable<GpsLocation[]> {
        return this.http.get<GpsLocation[]>(this.apiUrl);
    }

    getById(id: number): Observable<GpsLocation> {
        return this.http.get<GpsLocation>(`${this.apiUrl}/${id}`);
    }

    getByReservation(reservationId: number): Observable<GpsLocation[]> {
        return this.http.get<GpsLocation[]>(`${this.apiUrl}/reservation/${reservationId}`);
    }

    create(gpsLocation: GpsLocation): Observable<GpsLocation> {
        return this.http.post<GpsLocation>(this.apiUrl, gpsLocation);
    }

    update(id: number, gpsLocation: GpsLocation): Observable<GpsLocation> {
        return this.http.put<GpsLocation>(`${this.apiUrl}/${id}`, gpsLocation);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    saveLocation(location: Partial<GpsLocation>): Observable<GpsLocation> {
        return this.http.post<GpsLocation>(`${this.apiUrl}`, location);
    }

    /**
     * Get current position of a vehicle from backend
     */
    getVehicleCurrentPosition(vehicleId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/vehicle/${vehicleId}/current`);
    }

    /**
     * Compare actual vs estimated distance
     */
    compareDistance(reservationId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/reservation/${reservationId}/compare`);
    }

    /**
     * Get trip statistics
     */
    getTripStats(reservationId: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/trip/${reservationId}/stats`);
    }

    /**
     * Start real-time polling for vehicle position
     */
    startLiveTracking(vehicleId: number, intervalMs: number = 5000): Observable<any> {
        return new Observable(observer => {
            const fetchPosition = () => {
                this.getVehicleCurrentPosition(vehicleId).subscribe({
                    next: (data) => observer.next(data),
                    error: (err) => observer.error(err)
                });
            };

            // Initial fetch
            fetchPosition();

            // Set up interval
            const intervalId = setInterval(fetchPosition, intervalMs);

            // Cleanup function
            return () => clearInterval(intervalId);
        });
    }

    // Nouveau : calculer itinéraire avec OSRM
    calculateRoute(
        startLat: number,
        startLng: number,
        endLat: number,
        endLng: number
    ): Observable<any> {
        return this.http.post(`${this.apiUrl}/calculate-route`, {
            start_lat: startLat,
            start_lng: startLng,
            end_lat: endLat,
            end_lng: endLng,
        });
    }

    // Sync simulation target for mobile app
    setSimulationTarget(vehicleId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/set-simulation-target`, { vehicle_id: vehicleId });
    }

    // 🗺️ Calculate distance between two points using Haversine formula
    calculateDistance(point1: LatLng, point2: LatLng): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(point2.lat - point1.lat);
        const dLon = this.deg2rad(point2.lng - point1.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // 📍 Calculate total distance for a route (array of points)
    calculateRouteDistance(points: LatLng[]): number {
        let totalDistance = 0;
        for (let i = 0; i < points.length - 1; i++) {
            totalDistance += this.calculateDistance(points[i], points[i + 1]);
        }
        return Math.round(totalDistance * 100) / 100; // Round to 2 decimals
    }

    // 🎯 Get current position from browser geolocation
    getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
            } else {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            }
        });
    }

    // 📊 Watch position for real-time tracking
    watchPosition(callback: (position: GeolocationPosition) => void): number {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }
        return navigator.geolocation.watchPosition(callback, null, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    // ⏹️ Stop watching position
    clearWatch(watchId: number): void {
        navigator.geolocation.clearWatch(watchId);
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
