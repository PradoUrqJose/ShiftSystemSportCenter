import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// Plantilla de horario para el modal de turnos (ver turno-modal.component.ts,
// sección "Plantillas rápidas"). Sin tienda ni turno asociados a propósito:
// es solo un atajo para rellenar hora de entrada/salida con un click, no
// queda ninguna referencia a la plantilla en el turno que termina creándose.
export interface TurnoPredeterminado {
  id?: number;
  horaEntrada: string;
  horaSalida: string;
}

@Injectable({
  providedIn: 'root',
})
export class TurnoPredeterminadoService {
  private apiUrl = `${environment.apiUrl}/turnos-predeterminados`;

  // Cacheado en memoria: turno-modal y turnos-masivos-modal viven siempre
  // montados en la página de turnos y los dos pedían la lista al iniciar
  // (dos requests idénticos en cada carga). Se invalida al crear/eliminar.
  private plantillas$?: Observable<TurnoPredeterminado[]>;

  constructor(private http: HttpClient) {}

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts).

  getTurnosPredeterminados(): Observable<TurnoPredeterminado[]> {
    this.plantillas$ ??= this.http.get<TurnoPredeterminado[]>(this.apiUrl).pipe(shareReplay(1));
    return this.plantillas$;
  }

  addTurnoPredeterminado(plantilla: TurnoPredeterminado): Observable<TurnoPredeterminado> {
    return this.http.post<TurnoPredeterminado>(this.apiUrl, plantilla).pipe(tap(() => (this.plantillas$ = undefined)));
  }

  deleteTurnoPredeterminado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(tap(() => (this.plantillas$ = undefined)));
  }
}
