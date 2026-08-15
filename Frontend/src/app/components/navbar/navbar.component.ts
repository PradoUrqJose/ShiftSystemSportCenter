import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { BadgeComponent } from '../ui/badge/badge.component';
import { ButtonComponent } from '../ui/button/button.component';

interface NavItem {
  label: string;
  link: string;
  icon: 'empresas' | 'colaboradores' | 'turnos' | 'feriados';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule, AvatarComponent, BadgeComponent, ButtonComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export default class NavbarComponent {
  readonly navItems: NavItem[] = [
    { label: 'Empresas', link: '/empresas', icon: 'empresas' },
    { label: 'Colaboradores', link: '/colaboradores', icon: 'colaboradores' },
    { label: 'Turnos', link: '/turnos', icon: 'turnos' },
    { label: 'Feriados', link: '/feriados', icon: 'feriados' },
  ];

  isReportesOpen = false;
  reportes = [
    { nombre: 'Preliquidación Mensual', link: '/reportes/preliquidacion' },
    { nombre: 'Excepciones y Calidad', link: '/reportes/excepciones' },
    { nombre: 'Horas Trabajadas', link: '/reportes/horas-trabajadas' },
    { nombre: 'Turnos en Feriados', link: '/reportes/turnos-feriados' },
    { nombre: 'Semana Normal', link: '/reportes/semana-normal' }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  get username(): string | null {
    return this.authService.getUsername();
  }

  get roleLabel(): string {
    const role = this.authService.getRole() ?? '';
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  /** Iniciales para el avatar del pie — no hay nombre real en el JWT
   * (solo username/role), así que se toman las 2 primeras letras del
   * usuario, mismo criterio de "fallback sin foto" que usa AvatarComponent
   * en el resto de la app. */
  get initials(): string {
    return (this.username ?? '?').slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Método para verificar si alguna ruta de "Reportes" está activa
  isReportesActive(): boolean {
    return this.reportes.some(reporte => this.router.url.includes(reporte.link));
  }

  trackByLink(_index: number, reporte: { link: string }): string {
    return reporte.link;
  }

}
