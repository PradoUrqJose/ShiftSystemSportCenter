import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap((res) => localStorage.setItem(TOKEN_KEY, res.token)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const claims = this.decodeToken();
    if (!claims) return false;
    // exp viene en segundos (estándar JWT), Date.now() en milisegundos.
    return claims.exp * 1000 > Date.now();
  }

  getRole(): string | null {
    return this.decodeToken()?.role ?? null;
  }

  getUsername(): string | null {
    return this.decodeToken()?.sub ?? null;
  }

  /**
   * Decodifica el payload del JWT SOLO para uso de UI (mostrar el usuario,
   * ocultar botones, saber si "parece" vencido). No es una verificación de
   * seguridad — la firma nunca se valida acá, eso lo hace siempre el
   * backend en cada request. Un usuario podría editar este payload en su
   * propio navegador sin que le sirva de nada: el backend lo rechazaría.
   */
  private decodeToken(): { sub: string; role: string; exp: number } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
