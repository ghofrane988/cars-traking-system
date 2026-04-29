import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NouvelleReservationComponent } from './pages/nouvelle-reservation/nouvelle-reservation.component';

const routes: Routes = [
  { path: 'nouvelle-reservation', component: NouvelleReservationComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReservationsRoutingModule { }
