import { Feriado } from './feriado.service';
import { DiaSemana } from './calendario.service';
// turno.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { environment } from '../../environments/environment';


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
  esFeriado?: boolean; // ✅ EsFeriado
  horasTotalesSemana?: number; // ✅ HorasTotalesSemana
}

export interface TurnoPayload {
  colaborador: { id: number | undefined }; // Solo el ID del colaborador
  fecha: string; // Fecha del turno
  horaEntrada: string; // Hora de entrada
  horaSalida: string; // Hora de salida
  empresa: { id: number }; // Solo el ID de la empresa\
  tienda: { id: number }; // Solo el ID de la tienda
}

export interface ResumenMensual {
  colaboradorId: number;
  nombreColaborador: string;
  totalHorasMes: number;
  diasFeriadosTrabajados: number;
  horasEnFeriados: number;
  turnos?: Turno[]; // Opcional, si decides incluir los turnos detallados
}

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private apiUrl = `${environment.apiUrl}/turnos`;

  constructor(private http: HttpClient) { }

  getTurnosPorSemana(fecha: Date): Observable<Turno[]> {
    const formattedDate = format(fecha, 'yyyy-MM-dd');
    return this.http.get<Turno[]>(`${this.apiUrl}?fecha=${formattedDate}`).pipe(
      tap((turnos) => console.log('🔄 Turnos recibidos del backend por Semana:', turnos)), // Debugging
      catchError((error) => {
        console.error('❌ Error al obtener turnos:', error);
        return throwError(() => new Error('No se pudieron cargar los turnos. Intente más tarde.'));
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

  // ---- AGREGADOS PARA LA OPTIMIZACIÓN --------
  getSemanasDelMes(mes: number, anio: number): Observable<DiaSemana[][]> {
    return this.http
      .get<string[][]>(`${this.apiUrl}/semanas-del-mes?mes=${mes}&anio=${anio}`)
      .pipe(
        tap((semanas) => console.log('Semanas obtenidas:', semanas)),
        map((semanas) =>
          semanas.map((semana) =>
            semana.map((fechaStr) => {
              const fecha = new Date(fechaStr + 'T00:00:00'); // Corregir la conversión de zona horaria
              const diaSemana: DiaSemana = {
                fecha: format(fecha, 'yyyy-MM-dd'),
                nombre: format(fecha, 'EEE', { locale: es }), // Aquí estaba el error
                dayNumber: format(fecha, 'd'), // Se estaba asignando el día de la fecha anterior
                monthNombre: format(fecha, 'MMMM', { locale: es }),
                yearName: format(fecha, 'yyyy'),
              };
              return diaSemana;
            })
          )
        ),
        catchError((error) => {
          console.error('Error al obtener semanas del mes:', error);
          return throwError(() => new Error('Error al obtener las semanas.'));
        })
      );
  }

  // ✅ Método para obtener turnos semanales según las semanas del mes
  getTurnosPorSemanaEstricta(mes: number, anio: number, semana: number): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.apiUrl}/semanal-estricto?mes=${mes}&anio=${anio}&semana=${semana}`).pipe(
      tap((turnos) => console.log('🔄 Turnos recibidos del backend por Semana Estricta:', turnos)), // Debugging
      catchError((error) => {
        console.error('❌ Error al obtener turnos por semana estricta:', error);
        return throwError(() => new Error('No se pudieron cargar los turnos. Intente más tarde.'));
      })
    );
  }

  /**
 * Filtra los turnos de un colaborador específico en una fecha específica.
 * @param turnos Lista de turnos.
 * @param colaboradorId ID del colaborador.
 * @param fecha Fecha a buscar.
 * @returns Turno correspondiente o `null` si no existe.
 */
  obtenerTurno(turnos: Turno[], colaboradorId: number, fecha: string): Turno | null {
    return turnos.find(
      (turno) => turno.colaboradorId === colaboradorId && turno.fecha === fecha
    ) || null;
  }

  /**
   * Determina si una fecha es un día feriado.
   * @param fecha Fecha en formato `yyyy-MM-dd`.
   * @param feriados Lista de feriados.
   * @returns `true` si es feriado, `false` en caso contrario.
   */
  esFeriado(fecha: string, feriados: Feriado[]): boolean {
    return feriados.some((feriado) => feriado.fecha === fecha);
  }

  /**
 * Obtener el resumen mensual de horas trabajadas y feriados para uno o varios colaboradores.
 * @param mes Mes (1-12).
 * @param anio Año (ejemplo: 2025).
 * @param colaboradoresIds Lista opcional de IDs de colaboradores (separados por coma si se envían como string).
 * @returns Observable con la lista de resúmenes mensuales.
 */
  getResumenMensual(mes: number, anio: number, colaboradoresIds?: number[]): Observable<ResumenMensual[]> {
    let url = `${this.apiUrl}/resumen-mensual?mes=${mes}&anio=${anio}`;

    // Si se proporcionan IDs de colaboradores, añadirlos como parámetro
    if (colaboradoresIds && colaboradoresIds.length > 0) {
      const colaboradoresParam = colaboradoresIds.join(',');
      url += `&colaboradores=${colaboradoresParam}`;
    }

    return this.http.get<ResumenMensual[]>(url).pipe(
      tap((resumenes) => console.log('📊 Resumen mensual recibido:', resumenes)),
      catchError((error) => {
        console.error('❌ Error al obtener el resumen mensual:', error);
        return throwError(() => new Error('No se pudo cargar el resumen mensual. Intente más tarde.'));
      })
    );
  }
}
