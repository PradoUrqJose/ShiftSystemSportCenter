import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Traduce un HttpErrorResponse a un mensaje que se le puede mostrar tal
 * cual al usuario. Antes cada servicio tenía su propio catchError con su
 * propio texto (o, peor, mostraba `error.error` crudo del backend, que
 * puede traer detalles de implementación). Centralizarlo acá evita esa
 * duplicación y asegura que nunca se filtre un mensaje interno del backend.
 */
function mensajeAmigable(error: HttpErrorResponse): string {
  // El backend a veces manda un string plano en el body, otras veces un
  // objeto { message }. Solo confiamos en ese texto para errores de
  // validación (400) — son los únicos pensados para mostrarse al usuario.
  const mensajeBackend =
    typeof error.error === 'string' ? error.error : error.error?.message;

  switch (error.status) {
    case 0:
      return 'No se pudo conectar con el servidor. Intente más tarde.';
    case 400:
      return mensajeBackend || 'Los datos enviados no son válidos.';
    case 403:
      return 'No tiene permisos para realizar esta acción.';
    case 404:
      return 'No se encontró el recurso solicitado.';
    case 409:
      return mensajeBackend || 'La operación no se pudo completar por un conflicto de datos.';
    default:
      return 'Ocurrió un error en el servidor. Intente más tarde.';
  }
}

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
        return throwError(() => error);
      }
      // El login maneja su propio 401 (usuario/contraseña incorrectos) con
      // su propio mensaje, así que no lo pisamos con el genérico de acá.
      if (error.status === 401 && isLoginRequest) {
        return throwError(() => error);
      }
      return throwError(() => new Error(mensajeAmigable(error)));
    })
  );
};
