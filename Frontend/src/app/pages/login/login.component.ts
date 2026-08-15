import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Notiflix from 'notiflix';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ButtonComponent } from '../../components/ui/button/button.component';

/** Fila decorativa de la mini-grilla de turnos del panel derecho — no son
 * datos reales, solo una miniatura del feature (weekly-view) para
 * ambientar el login. Los colores reusan los tokens --shift-* reales
 * (tokens.css) para que se sienta parte de la misma app, no un stock de
 * ilustración genérico. */
interface ShowcaseRow {
  iniciales: string;
  avatarBg: string;
  avatarInk: string;
  left: number;
  width: number;
  bg: string;
  border: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export default class LoginComponent implements OnDestroy {
  username = '';
  password = '';
  showPassword = false;
  isSubmitting = false;
  /** Dispara la animación de "sacudida" de la tarjeta en credenciales inválidas — la
   * confirmación real sigue siendo el toast de Notiflix, esto es solo refuerzo visual. */
  loginFailed = false;

  /** Parallax del panel derecho: desplazamiento en px seteado por mousemove,
   * consumido en CSS vía [style.--mx]/[style.--my]. Se queda en 0 si el
   * usuario prefiere menos movimiento. */
  parallaxX = 0;
  parallaxY = 0;

  readonly showcaseRows: ShowcaseRow[] = [
    { iniciales: 'MJ', avatarBg: 'var(--hue-teal-soft)', avatarInk: 'var(--hue-teal)', left: 6, width: 55, bg: 'var(--shift-normal-bg)', border: 'var(--shift-normal-border)' },
    { iniciales: 'AR', avatarBg: 'var(--hue-violet-soft)', avatarInk: 'var(--hue-violet)', left: 22, width: 38, bg: 'var(--shift-split-1-bg)', border: 'var(--shift-split-1-border)' },
    { iniciales: 'LP', avatarBg: 'var(--color-brand-soft)', avatarInk: 'var(--color-brand)', left: 4, width: 68, bg: 'var(--shift-overtime-bg)', border: 'var(--shift-overtime-border)' },
    { iniciales: 'DC', avatarBg: 'var(--hue-teal-soft)', avatarInk: 'var(--hue-teal)', left: 30, width: 44, bg: 'var(--shift-normal-bg)', border: 'var(--shift-normal-border)' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(private authService: AuthService, private router: Router) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(): void {
    if (!this.username || !this.password || this.isSubmitting) return;

    this.isSubmitting = true;
    this.authService.login(this.username, this.password).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/turnos']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const mensaje = err.status === 401 ? 'Usuario o contraseña incorrectos' : 'No se pudo conectar con el servidor';
        Notiflix.Notify.failure(mensaje);
        this.loginFailed = true;
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /** Parallax sutil del panel derecho — respeta prefers-reduced-motion, no hay
   * animación equivalente en CSS puro para seguir al mouse. */
  onShowcaseMove(event: MouseEvent, showcase: HTMLElement): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = showcase.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    this.parallaxX = relX * 24;
    this.parallaxY = relY * 18;
  }

  onShowcaseLeave(): void {
    this.parallaxX = 0;
    this.parallaxY = 0;
  }
}
