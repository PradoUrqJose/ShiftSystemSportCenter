// turno.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { Colaborador } from './colaborador.service';
import { format } from 'date-fns';

export interface Turno {
  id: number; // ID del turno
  nombreColaborador: string; // Nombre del colaborador
  dniColaborador: string; // DNI del colaborador
  nombreEmpresa: string; // Nombre de la empresa
  empresaId?: number; // ID de la empresa (nuevo campo opcional)
  colaboradorId?: number; // ID del colaborador (nuevo campo opcional)
  fecha: string; // Fecha del turno
  horaEntrada: string; // Hora de entrada
  horaSalida: string; // Hora de salida
  horasTrabajadas?: number; // Horas trabajadas (opcional)
  tiendaId?: number | null; // Añadir tiendaId
  nombreTienda?: string; // Añadir tiendaNombre
  tomoAlmuerzo?: boolean; // Añadir tomoAlmuerzo
}

export interface TurnoPayload {
  colaborador: { id: number | undefined }; // Solo el ID del colaborador
  fecha: string; // Fecha del turno
  horaEntrada: string; // Hora de entrada
  horaSalida: string; // Hora de salida
  empresa: { id: number }; // Solo el ID de la empresa\
  tienda: { id: number }; // Solo el ID de la tienda
}

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private apiUrl = 'http://localhost:8080/api/turnos';

  constructor(private http: HttpClient) {}

  getTurnosPorSemana(fecha: Date): Observable<Turno[]> {
    const formattedDate = format(fecha, 'yyyy-MM-dd');
    return this.http.get<Turno[]>(`${this.apiUrl}?fecha=${formattedDate}`).pipe(
      map((turnos: Turno[]) =>
        turnos.map((turno) => ({
          ...turno,
          horasTrabajadas: turno.horasTrabajadas ?? 0,
        }))
      ),
      catchError((error) => {
        console.error('Error al obtener turnos:', error);
        return throwError(
          () =>
            new Error('No se pudieron cargar los turnos. Intente más tarde.')
        );
      })
    );
  }

  /**
   * Obtener turnos por mes para un colaborador específico.
   * @param colaboradorId ID del colaborador.
   * @param mes Mes (1-12).
   * @param anio Año (ejemplo: 2025).
   * @returns Observable con la lista de turnos.
   */
  getTurnosMensualesPorColaborador(
    colaboradorId: number,
    mes: number,
    anio: number
  ): Observable<Turno[]> {
    return this.http
      .get<Turno[]>(
        `${this.apiUrl}/mensual/${colaboradorId}?mes=${mes}&anio=${anio}`
      )
      .pipe(
        map((turnos) =>
          turnos.map((turno) => ({
            ...turno,
            horasTrabajadas: turno.horasTrabajadas ?? 0,
          }))
        ),
        catchError((error) => {
          console.error(
            'Error al obtener turnos mensuales por colaborador:',
            error
          );
          return throwError(
            () =>
              new Error('No se pudieron cargar los turnos. Intente más tarde.')
          );
        })
      );
  }

  /**
   * Obtener turnos por mes para todos los colaboradores.
   * @param mes Mes (1-12).
   * @param anio Año (ejemplo: 2025).
   * @returns Observable con la lista de turnos.
   */
  getTurnosMensuales(mes: number, anio: number): Observable<Turno[]> {
    return this.http
      .get<Turno[]>(`${this.apiUrl}/mensual?mes=${mes}&anio=${anio}`)
      .pipe(
        map((turnos) =>
          turnos.map((turno) => ({
            ...turno,
            horasTrabajadas: turno.horasTrabajadas ?? 0,
          }))
        ),
        catchError((error) => {
          console.error('Error al obtener turnos mensuales:', error);
          return throwError(
            () =>
              new Error('No se pudieron cargar los turnos. Intente más tarde.')
          );
        })
      );
  }

  updateTurno(id: number, turno: TurnoPayload): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, turno).pipe(
      catchError((error) => {
        // Reenviar el error para que el componente lo gestione
        return throwError(
          () => new Error(error.error.message || 'Error desconocido')
        );
      })
    );
  }

  addTurno(turno: TurnoPayload): Observable<any> {
    return this.http.post(this.apiUrl, turno).pipe(
      catchError((error) => {
        // Reenviar el error para que el componente lo gestione
        return throwError(
          () => new Error(error.error.message || 'Error desconocido')
        );
      })
    );
  }

  deleteTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
