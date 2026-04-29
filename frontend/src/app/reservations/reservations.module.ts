import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ReservationsRoutingModule } from './reservations-routing.module';

import { ReservationListComponent } from './pages/reservation-list/reservation-list.component';
import { NouvelleReservationComponent } from './pages/nouvelle-reservation/nouvelle-reservation.component';


@NgModule({
  declarations: [
    ReservationListComponent,
    NouvelleReservationComponent,
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReservationsRoutingModule
  ]
})
export class ReservationsModule { }
