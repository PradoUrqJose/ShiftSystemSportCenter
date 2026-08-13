import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import NavbarComponent from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'sportcenter-shift-manager';

  // El login es la única pantalla sin navbar/sidebar (no tiene sentido
  // mostrar navegación a datos protegidos antes de estar logueado).
  // toSignal en vez de subscribe(): AppComponent vive toda la vida de la
  // app, así que una suscripción manual acá no sería un leak real, pero
  // usamos el patrón sin subscribe de todos modos para no normalizar el
  // hábito que causa los leaks reales en otros componentes (ver Etapa 3).
  readonly isLoginPage;

  constructor(private router: Router) {
    this.isLoginPage = toSignal(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects.startsWith('/login'))
      ),
      { initialValue: this.router.url.startsWith('/login') }
    );
  }
}
