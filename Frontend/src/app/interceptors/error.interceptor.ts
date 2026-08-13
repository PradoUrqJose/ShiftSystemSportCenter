import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Si cualquier request vuelve con 401, significa que el token no sirve más
 * (venció, es inválido, o nunca hubo). Deslogueamos y mandamos a /login.
 * Excepción: el 401 del login en sí (contraseña incorrecta) no debe
 * redirigir a nadie a ningún lado — eso lo maneja el propio formulario de
 * login mostrando el error, porque ahí el usuario ya está en /login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes('/auth/login');
      if (error.status === 401 && !isLoginRequest) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
