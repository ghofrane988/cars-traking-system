import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import localeFr from '@angular/common/locales/fr';
import { registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';

registerLocaleData(localeFr);

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Components
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { AuthModule } from './auth/auth.module';
import { DashboardAdminComponent } from './dashboard/pages/dashboard-admin/dashboard-admin.component';
import { DashboardEmployeeComponent } from './dashboard/pages/dashboard-employee/dashboard-employee.component';
import { VehicleListComponent } from './vehicles/pages/vehicle-list/vehicle-list.component';
import { ReservationListComponent } from './reservations/pages/reservation-list/reservation-list.component';
import { EmployeeHistoryComponent } from './reservations/pages/employee-history/employee-history.component';
import { TripHistoryComponent } from './reservations/pages/trip-history/trip-history.component';
import { EmployeeListComponent } from './employees/pages/employee-list/employee-list.component';
import { MaintenanceHistoryComponent } from './maintenances/pages/maintenance-history/maintenance-history.component';
import { NotificationIconComponent } from './shared/components/notification-icon/notification-icon.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { MapComponent } from './shared/components/map/map.component';
import { NouvelleReservationComponent } from './reservations/pages/nouvelle-reservation/nouvelle-reservation.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { HomeComponent } from './home/home.component';
import { FleetCalendarComponent } from './reservations/components/fleet-calendar/fleet-calendar.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    DashboardAdminComponent,
    DashboardEmployeeComponent,
    VehicleListComponent,
    ReservationListComponent,
    EmployeeHistoryComponent,
    TripHistoryComponent,
    EmployeeListComponent,
    MaintenanceHistoryComponent,
    NotificationIconComponent,
    ToastComponent,
    MapComponent,
    NouvelleReservationComponent,
    HomeComponent,
    FleetCalendarComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    AuthModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
