import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GpsRoutingModule } from './gps-routing.module';
import { SimulationGpsComponent } from './pages/simulation-gps/simulation-gps.component';


@NgModule({
  declarations: [
    SimulationGpsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    GpsRoutingModule
  ]
})
export class GpsModule { }
