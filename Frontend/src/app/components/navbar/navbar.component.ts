import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export default class NavbarComponent {
  isReportesOpen = false;
  reportes = [
    { nombre: 'Horas Trabajadas', link: '/reportes/horas-trabajadas' },
    { nombre: 'Turnos en Feriados', link: '/reportes/turnos-feriados' },
    { nombre: 'Semana Normal', link: '/reportes/semana-normal' }
  ];

  constructor(private router: Router) {}

  // Método para verificar si alguna ruta de "Reportes" está activa
  isReportesActive(): boolean {
    return this.reportes.some(reporte => this.router.url.includes(reporte.link));
  }
}
