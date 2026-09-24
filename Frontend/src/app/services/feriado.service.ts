import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Feriado {
  id?: number;
  fecha: string; // Formato YYYY-MM-DD
  descripcion: string;
}

@Injectable({
  providedIn: 'root',
})
export class FeriadoService {
  private apiUrl = `${environment.apiUrl}/feriados`;

  // Lista de feriados cacheada en memoria: weekly-view, monthly-view y
  // gestionar-feriados la pedían cada vez que se montaban (en turnos, cada
  // cambio de semana recrea weekly-view). Cambia muy poco y en prod cada
  // request cruza backend<->BD entre regiones, así que se pide una vez y se
  // invalida solo cuando este mismo servicio crea/edita/elimina un feriado.
  private feriados$?: Observable<Feriado[]>;

  constructor(private http: HttpClient) {}

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts).

  getFeriados(): Observable<Feriado[]> {
    this.feriados$ ??= this.http.get<Feriado[]>(this.apiUrl).pipe(shareReplay(1));
    return this.feriados$;
  }

  private invalidarCache(): void {
    this.feriados$ = undefined;
  }

  isFeriado(fecha: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/es-feriado`, { params: { fecha } });
  }

  crearFeriado(feriado: Feriado): Observable<Feriado> {
    return this.http.post<Feriado>(this.apiUrl, feriado).pipe(tap(() => this.invalidarCache()));
  }

  actualizarFeriado(id: number, feriado: Feriado): Observable<Feriado> {
    return this.http.put<Feriado>(`${this.apiUrl}/${id}`, feriado).pipe(tap(() => this.invalidarCache()));
  }

  eliminarFeriado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(tap(() => this.invalidarCache()));
  }
}
