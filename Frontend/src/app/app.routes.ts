import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component'),
  },
  {
    path: 'empresas',
    loadComponent: () => import('./pages/empresas/empresas.component'),
    canActivate: [authGuard],
  },
  {
    path: 'colaboradores',
    loadComponent: () => import('./pages/colaboradores/colaboradores.component'),
    canActivate: [authGuard],
  },
  {
    path: 'puestos',
    loadComponent: () => import('./pages/colaboradores/gestionar-puestos/gestionar-puestos.component'),
    canActivate: [authGuard],
  },
  {
    path: 'turnos',
    loadComponent: () => import('./pages/turnos/turnos.component'),
    canActivate: [authGuard],
  },
  {
    path: 'feriados',
    loadComponent: () => import('./pages/turnos/gestionar-feriados/gestionar-feriados.component'),
    canActivate: [authGuard],
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reportes/reportes.component'),
    canActivate: [authGuard],
    children: [
      {
        path: 'resumen',
        loadComponent: () =>
          import('./pages/reportes/resumen/resumen.component').then(
            m => m.ResumenComponent
          ),
      },
      {
        path: 'horas-trabajadas',
        loadComponent: () =>
          import('./pages/reportes/horas-trabajadas/horas-trabajadas.component').then(
            m => m.HorasTrabajadasComponent
          ),
      },
      {
        path: 'preliquidacion',
        loadComponent: () =>
          import('./pages/reportes/preliquidacion-mensual/preliquidacion-mensual.component').then(
            m => m.PreliquidacionMensualComponent
          ),
      },
      {
        path: 'excepciones',
        loadComponent: () =>
          import('./pages/reportes/excepciones/excepciones.component').then(
            m => m.ExcepcionesComponent
          ),
      },
      {
        path: 'colaborador-profile/:id',
        loadComponent: () =>
          import('./pages/reportes/colaborador-profile/colaborador-profile.component').then(
            m => m.ColaboradorProfileComponent
          ),
      },
      {
        path: 'turnos-feriados',
        loadComponent: () =>
          import('./pages/reportes/turnos-feriados/turnos-feriados.component').then(
            m => m.TurnosFeriadosComponent
          ),
      },
      {
        path: 'semana-normal',
        loadComponent: () =>
          import('./pages/reportes/semana-normal/semana-normal.component').then(
            m => m.SemanaNormalComponent
          ),
      },
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'turnos', pathMatch: 'full' },
  { path: '**', redirectTo: 'empresas' },
];
