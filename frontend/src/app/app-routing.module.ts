import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login/login.component';
import { HomeComponent } from './home/home.component';
import { DashboardAdminComponent } from './dashboard/pages/dashboard-admin/dashboard-admin.component';
import { DashboardEmployeeComponent } from './dashboard/pages/dashboard-employee/dashboard-employee.component';
import { VehicleListComponent } from './vehicles/pages/vehicle-list/vehicle-list.component';
import { ReservationListComponent } from './reservations/pages/reservation-list/reservation-list.component';
import { TripHistoryComponent } from './reservations/pages/trip-history/trip-history.component';
import { NouvelleReservationComponent } from './reservations/pages/nouvelle-reservation/nouvelle-reservation.component';
import { EmployeeListComponent } from './employees/pages/employee-list/employee-list.component';
import { MaintenanceHistoryComponent } from './maintenances/pages/maintenance-history/maintenance-history.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

import { ForgotPasswordComponent } from './auth/pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/pages/reset-password/reset-password.component';
import { FirstLoginComponent } from './auth/pages/first-login/first-login.component';
import { ChangePasswordComponent } from './auth/pages/change-password/change-password.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'first-login', component: FirstLoginComponent, canActivate: [AuthGuard] },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [AuthGuard] },
  {
    path: 'admin/dashboard',
    component: DashboardAdminComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'employee/dashboard',
    component: DashboardEmployeeComponent,
    canActivate: [AuthGuard]
  },
  // History was merged into dashboard
  {
    path: 'vehicles',
    component: VehicleListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'reservations',
    component: ReservationListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'nouvelle-reservation',
    component: NouvelleReservationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'calendar',
    component: ReservationListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'admin/trip-history',
    component: TripHistoryComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/employees',
    component: EmployeeListComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: 'admin/maintenances',
    component: MaintenanceHistoryComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  // 🚗 GPS Tracking (Phase 4)
  {
    path: 'gps',
    loadChildren: () => import('./gps/gps.module').then(m => m.GpsModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
