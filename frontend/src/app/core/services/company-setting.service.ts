import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompanySetting {
    id?: number;
    parking_lat: number;
    parking_lng: number;
    parking_address?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CompanySettingService {
    private apiUrl = `${environment.apiUrl}/company-settings`;

    constructor(private http: HttpClient) { }

    getSettings(): Observable<CompanySetting> {
        return this.http.get<CompanySetting>(this.apiUrl);
    }

    updateSettings(settings: CompanySetting): Observable<CompanySetting> {
        return this.http.put<CompanySetting>(this.apiUrl, settings);
    }
}
