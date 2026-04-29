import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VehiclesRoutingModule } from './vehicles-routing.module';
import { VehicleListComponent } from './pages/vehicle-list/vehicle-list.component';


@NgModule({
  declarations: [
    VehicleListComponent
  ],
  imports: [
    CommonModule,
    VehiclesRoutingModule
  ]
})
export class VehiclesModule { }
