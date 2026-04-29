import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SimulationGpsComponent } from './pages/simulation-gps/simulation-gps.component';

const routes: Routes = [
  {
    path: '',
    component: SimulationGpsComponent,
    title: 'Suivi GPS Temps Réel'
  },
  {
    path: 'suivi-temps-reel',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GpsRoutingModule { }
