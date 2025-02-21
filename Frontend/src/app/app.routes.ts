import { Routes } from '@angular/router';

import ColaboradoresComponent from './pages/colaboradores/colaboradores.component';
import EmpresasComponent from './pages/empresas/empresas.component';
import TurnosComponent from './pages/turnos/turnos.component';
import ReportesComponent from './pages/reportes/reportes.component';
import { HorasTrabajadasComponent } from './pages/reportes/horas-trabajadas/horas-trabajadas.component';
import { TurnosFeriadosComponent } from './pages/reportes/turnos-feriados/turnos-feriados.component';
import { HorasExtrasComponent } from './pages/reportes/horas-extras/horas-extras.component';
import { SemanaNormalComponent } from './pages/reportes/semana-normal/semana-normal.component';

export const routes: Routes = [
  { path: 'empresas', component: EmpresasComponent },
  { path: 'colaboradores', component: ColaboradoresComponent },
  { path: 'turnos', component: TurnosComponent },
  {
    path: 'reportes',
    component: ReportesComponent,
    children: [
      { path: 'horas-trabajadas', component: HorasTrabajadasComponent },
      { path: 'turnos-feriados', component: TurnosFeriadosComponent },
      { path: 'horas-extras', component: HorasExtrasComponent },
      { path: 'semana-normal', component: SemanaNormalComponent },
      { path: '', redirectTo: 'horas-trabajadas', pathMatch: 'full' }
    ]
  }, { path: '', redirectTo: 'turnos', pathMatch: 'full' },
  { path: '**', redirectTo: 'empresas' }
];
