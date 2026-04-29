import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaintenancesRoutingModule } from './maintenances-routing.module';
import { MaintenanceHistoryComponent } from './pages/maintenance-history/maintenance-history.component';


@NgModule({
  declarations: [
    MaintenanceHistoryComponent
  ],
  imports: [
    CommonModule,
    MaintenancesRoutingModule
  ]
})
export class MaintenancesModule { }
