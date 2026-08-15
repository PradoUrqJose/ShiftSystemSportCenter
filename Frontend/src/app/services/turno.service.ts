import { Feriado } from './feriado.service';
// turno.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, forkJoin } from 'rxjs';
import { format } from 'date-fns';
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

// Turno "vacío" para inicializar el formulario de alta. Antes cada
// componente que abre el modal de turno (turnos, turno-modal, semana-normal)
// tenía su propia copia idéntica de este objeto literal.
export function crearTurnoVacio(): Turno {
  return {
    id: 0,
    nombreColaborador: '',
    dniColaborador: '',
    nombreEmpresa: '',
    fecha: '',
    horaEntrada: '',
    horaSalida: '',
    horasTrabajadas: 0,
    tiendaId: null,
  };
}

// Forma plana: coincide con TurnoRequestDTO del backend (colaboradorId/
// tiendaId, sin empresaId — el backend resuelve la empresa a partir del
// colaborador, ver TurnoService.aplicarDatosTurno). Antes este payload
// mandaba objetos anidados {colaborador: {id}, tienda: {id}, empresa: {id}}
// — esa forma quedó desincronizada del backend en el refactor de la Etapa 2
// (TurnoRequestDTO se aplanó, el frontend nunca se actualizó) y rompía en
// silencio cualquier alta/edición de turno con "Los datos enviados no son
// válidos" (colaboradorId/tiendaId llegaban null). Encontrado probando
// Turnos Masivos de punta a punta, no es específico de esa función.
export interface TurnoPayload {
  colaboradorId: number;
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  tiendaId: number;
}

export interface TurnoPartidoPayload {
  colaboradorId: number;
  fecha: string;
  tiendaId: number;
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
      colaboradorId: turnoPartido.colaboradorId,
      fecha: turnoPartido.fecha,
      horaEntrada: turnoPartido.turnoManana.horaEntrada,
      horaSalida: turnoPartido.turnoManana.horaSalida,
      tiendaId: turnoPartido.tiendaId,
    };

    const turnoTarde: TurnoPayload = {
      colaboradorId: turnoPartido.colaboradorId,
      fecha: turnoPartido.fecha,
      horaEntrada: turnoPartido.turnoTarde.horaEntrada,
      horaSalida: turnoPartido.turnoTarde.horaSalida,
      tiendaId: turnoPartido.tiendaId,
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
  // Reemplaza a los viejos getSemanasDelMes()/getTurnosPorSemanaEstricta():
  // esos le pedían al backend que recalculara "las semanas del mes" (aritmética
  // de fechas pura) solo para volver a preguntarle "cuál es la semana número N"
  // — el mismo cálculo que CalendarioService ya hace en el navegador para
  // dibujar la grilla. Ahora el componente le manda el rango de fechas que ya
  // tiene calculado localmente. Los endpoints viejos siguen respondiendo
  // (backend los dejó @Deprecated) por si queda algún caller suelto.
  getTurnosPorRangoFecha(inicio: string, fin: string): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.apiUrl}/semanal`, { params: { inicio, fin } });
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

    getTurnosByColaboradorId(id: number): Observable<Turno[]> {
      return this.http.get<Turno[]>(`${this.apiUrl}/${id}`);
    }
}
