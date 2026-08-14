import { Feriado } from './feriado.service';
import { DiaSemana } from './calendario.service';
// turno.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, forkJoin } from 'rxjs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { environment } from '../../environments/environment';
import { PageResponse, PAGE_SIZE_ALL } from '../models/page-response.model';


export interface Turno {
  id: number;
  nombreColaborador: string;
  dniColaborador: string;
  nombreEmpresa: string;
  empresaId?: number;
  colaboradorId?: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  horasTrabajadas?: number;
  tiendaId?: number | null;
  nombreTienda?: string;
  tomoAlmuerzo?: boolean;
  esFeriado?: boolean;
  horasTotalesSemana?: number;
}

export interface TurnoPayload {
  colaborador: { id: number | undefined };
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  empresa: { id: number };
  tienda: { id: number };
}

export interface TurnoPartidoPayload {
  colaborador: { id: number | undefined };
  fecha: string;
  empresa: { id: number };
  tienda: { id: number };
  turnoManana: {
    horaEntrada: string;
    horaSalida: string;
  };
  turnoTarde: {
    horaEntrada: string;
    horaSalida: string;
  };
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

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts) — no hace
  // falta un catchError propio por método acá.

  getTurnosPorSemana(fecha: Date): Observable<Turno[]> {
    const formattedDate = format(fecha, 'yyyy-MM-dd');
    return this.http.get<Turno[]>(`${this.apiUrl}?fecha=${formattedDate}`);
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
        )
      );
  }

  /**
   * Obtener turnos por mes para todos los colaboradores.
   * @param mes Mes (1-12).
   * @param anio Año (ejemplo: 2025).
   * @returns Observable con la lista de turnos.
   */
  // GET /api/turnos/mensual devuelve paginado (Page<TurnoDTO>) desde la
  // Etapa 2 del backend. Pedimos una página grande para no truncar la lista
  // mientras no haya paginación real en la UI (ver PAGE_SIZE_ALL).
  getTurnosMensuales(mes: number, anio: number): Observable<Turno[]> {
    return this.http
      .get<PageResponse<Turno>>(
        `${this.apiUrl}/mensual?mes=${mes}&anio=${anio}`,
        { params: { size: PAGE_SIZE_ALL } }
      )
      .pipe(
        map((page) =>
          page.content.map((turno) => ({
            ...turno,
            horasTrabajadas: turno.horasTrabajadas ?? 0,
          }))
        )
      );
  }

  updateTurno(id: number, turno: TurnoPayload): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, turno);
  }

  addTurno(turno: TurnoPayload): Observable<any> {
    return this.http.post(this.apiUrl, turno);
  }

  addTurnoPartido(turnoPartido: TurnoPartidoPayload): Observable<any> {
    // Crear dos turnos separados para el turno partido
    const turnoManana: TurnoPayload = {
      colaborador: turnoPartido.colaborador,
      fecha: turnoPartido.fecha,
      horaEntrada: turnoPartido.turnoManana.horaEntrada,
      horaSalida: turnoPartido.turnoManana.horaSalida,
      empresa: turnoPartido.empresa,
      tienda: turnoPartido.tienda
    };

    const turnoTarde: TurnoPayload = {
      colaborador: turnoPartido.colaborador,
      fecha: turnoPartido.fecha,
      horaEntrada: turnoPartido.turnoTarde.horaEntrada,
      horaSalida: turnoPartido.turnoTarde.horaSalida,
      empresa: turnoPartido.empresa,
      tienda: turnoPartido.tienda
    };

    // Crear ambos turnos en paralelo usando forkJoin
    return forkJoin({
      turnoManana: this.addTurno(turnoManana),
      turnoTarde: this.addTurno(turnoTarde)
    });
  }

  deleteTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ---- AGREGADOS PARA LA OPTIMIZACIÓN --------
  getSemanasDelMes(mes: number, anio: number): Observable<DiaSemana[][]> {
    return this.http
      .get<string[][]>(`${this.apiUrl}/semanas-del-mes?mes=${mes}&anio=${anio}`)
      .pipe(
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
        )
      );
  }

  // ✅ Método para obtener turnos semanales según las semanas del mes
  getTurnosPorSemanaEstricta(mes: number, anio: number, semana: number): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.apiUrl}/semanal-estricto?mes=${mes}&anio=${anio}&semana=${semana}`);
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

    return this.http.get<ResumenMensual[]>(url);
  }

    // Método existente que ya tienes
    getTurnosByColaboradorId(id: number): Observable<any[]> {
      return this.http.get<any[]>(`${this.apiUrl}/${id}`);
    }
}
