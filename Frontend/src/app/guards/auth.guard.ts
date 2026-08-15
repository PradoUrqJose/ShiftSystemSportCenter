import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Bloquea la navegación a rutas privadas si no hay sesión válida. Esto es
 * solo UX (evita que se vea una pantalla vacía pidiendo datos que van a
 * dar 401) — la protección real siempre es la del backend, este guard no
 * "asegura" nada por sí solo.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
