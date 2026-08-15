import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) {}

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts).

  getTurnosPredeterminados(): Observable<TurnoPredeterminado[]> {
    return this.http.get<TurnoPredeterminado[]>(this.apiUrl);
  }

  addTurnoPredeterminado(plantilla: TurnoPredeterminado): Observable<TurnoPredeterminado> {
    return this.http.post<TurnoPredeterminado>(this.apiUrl, plantilla);
  }

  deleteTurnoPredeterminado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
