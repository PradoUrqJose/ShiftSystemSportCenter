import { Routes } from '@angular/router';

import ColaboradoresComponent from './pages/colaboradores/colaboradores.component';
import EmpresasComponent from './pages/empresas/empresas.component';
import TurnosComponent from './pages/turnos/turnos.component';

export const routes: Routes = [
  { path: 'empresas', component: EmpresasComponent },
  { path: 'colaboradores', component: ColaboradoresComponent },
  { path: 'turnos', component: TurnosComponent },
  { path: '', redirectTo: 'turnos', pathMatch: 'full' },
  { path: '**', redirectTo: 'empresas' }
];
