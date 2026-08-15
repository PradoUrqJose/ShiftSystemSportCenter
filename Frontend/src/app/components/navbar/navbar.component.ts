import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
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
export default class NavbarComponent implements AfterViewInit, OnDestroy {
  // Los 5 links "top-level" (4 rutas + el botón de Reportes) comparten la
  // misma referencia de plantilla #navLink — así el indicador deslizante
  // los mide a todos con un solo QueryList, en el orden real del DOM, sin
  // repetir la lista acá.
  @ViewChildren('navLink') navLinkEls!: QueryList<ElementRef<HTMLElement>>;

  readonly navItems: NavItem[] = [
    { label: 'Empresas', link: '/empresas', icon: 'empresas' },
    { label: 'Colaboradores', link: '/colaboradores', icon: 'colaboradores' },
    { label: 'Turnos', link: '/turnos', icon: 'turnos' },
    { label: 'Feriados', link: '/feriados', icon: 'feriados' },
  ];

  isReportesOpen = false;
  reportes = [
    { nombre: 'Horas Trabajadas', link: '/reportes/horas-trabajadas' },
    { nombre: 'Turnos en Feriados', link: '/reportes/turnos-feriados' },
    { nombre: 'Semana Normal', link: '/reportes/semana-normal' }
  ];

  /** Posición/tamaño del indicador que "desliza" detrás del item activo —
   * se mide el <a>/<button> real vía #navLink en vez de calcular a mano
   * con alturas fijas, así no se desincroniza si cambia el padding/gap. */
  indicatorTop = 0;
  indicatorHeight = 0;
  indicatorVisible = false;

  private readonly destroy$ = new Subject<void>();

  constructor(private router: Router, private authService: AuthService) {}

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.updateIndicator());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => requestAnimationFrame(() => this.updateIndicator()));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  private updateIndicator(): void {
    // Ojo: NO se busca acá la clase .active que pinta routerLinkActive en
    // el DOM — ese timing no es confiable (es otra directiva, con su
    // propia suscripción async a router.events; en el primer login la
    // medición corría antes de que la hubiera aplicado, y como después de
    // ese NavigationEnd no vuelve a haber otro, el indicador quedaba
    // pegado en el primer item para siempre). router.url en cambio está
    // disponible síncrono apenas dispara NavigationEnd, así que se
    // recalcula la posición activa acá mismo con la misma fuente de
    // verdad, no leyendo el resultado de otra directiva.
    const activeIndex = this.getActiveIndex();
    const activeEl = activeIndex === -1 ? undefined : this.navLinkEls?.get(activeIndex);
    if (!activeEl) {
      this.indicatorVisible = false;
      return;
    }
    this.indicatorTop = activeEl.nativeElement.offsetTop;
    this.indicatorHeight = activeEl.nativeElement.offsetHeight;
    this.indicatorVisible = true;
  }

  private getActiveIndex(): number {
    const url = this.router.url;
    const itemIndex = this.navItems.findIndex(
      item => url === item.link || url.startsWith(item.link + '/') || url.startsWith(item.link + '?')
    );
    if (itemIndex !== -1) return itemIndex;
    return this.isReportesActive() ? this.navItems.length : -1;
  }
}
