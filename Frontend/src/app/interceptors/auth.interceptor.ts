import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Le pega "Authorization: Bearer <token>" a cada request. No filtra por
 * URL (todas van a nuestra propia API), así que si en el futuro se llama
 * a un servicio de terceros desde el frontend, revisar esto para no
 * mandarle nuestro token a otro dominio.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(cloned);
};
