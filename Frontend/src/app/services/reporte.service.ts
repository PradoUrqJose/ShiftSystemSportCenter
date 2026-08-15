import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Turno } from './turno.service';

// Distribución de horas de un colaborador en una tienda, dentro del
// período de la preliquidación. Mismo shape que DistribucionTiendaDTO
// (backend).
export interface DistribucionTienda {
  tiendaId: number;
  nombreTienda: string;
  horas: number;
}

// Fila de GET /api/reportes/preliquidacion — mismo shape que
// PreliquidacionMensualDTO (backend). Es un reporte de solo lectura:
// no tiene estado ni observaciones persistidas (ver plan de reportes).
export interface PreliquidacionMensual {
  colaboradorId: number;
  dni: string;
  nombre: string;
  apellido: string;
  empresaId: number | null;
  nombreEmpresa: string;
  puestoId: number | null;
  nombrePuesto: string;
  diasProgramados: number;
  totalHorasMes: number;
  horasEnFeriados: number;
  horasExtraCandidatas: number;
  umbralHorasDiariasUsado: number;
  turnosPartidos: number;
  distribucionPorTienda: DistribucionTienda[];
  turnos: Turno[];
}

export type SeveridadExcepcion = 'ERROR' | 'RIESGO' | 'ADVERTENCIA' | 'INFORMACION';

export interface ExcepcionReporte {
  codigo: string;
  severidad: SeveridadExcepcion;
  titulo: string;
  detalle: string;
  colaboradorId: number | null;
  nombreColaborador: string;
  dni: string | null;
  empresaId: number | null;
  nombreEmpresa: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasProgramadas: number | null;
  umbralHoras: number | null;
  cantidadTurnos: number;
  turnoIds: number[];
}

export interface ReporteExcepciones {
  desde: string;
  hasta: string;
  umbralHorasDiarias: number;
  umbralJornadaExtrema: number;
  horizonteDias: number;
  errores: number;
  riesgos: number;
  advertencias: number;
  informativos: number;
  excepciones: ExcepcionReporte[];
}

// Los dos endpoints devuelven List<TurnoDTO> (backend) — el mismo shape que
// ya describe la interfaz Turno, no hace falta inventar una nueva. Antes
// ambos métodos devolvían Observable<any[]>, y ese `any` se filtraba a los
// componentes que los consumen (horas-trabajadas, turnos-feriados).
@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/turnos/reporte`;
  private reportesApiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) { }

  getHorasTrabajadas(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<Turno[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));
    }

    return this.http.get<Turno[]>(this.apiUrl, { params });
  }

  getTurnosFeriados(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<Turno[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));
    }
    return this.http.get<Turno[]>(`${this.apiUrl}/feriados`, { params });
  }

  getPreliquidacionMensual(
    mes: number,
    anio: number,
    empresaId?: number,
    umbralHorasDiarias?: number
  ): Observable<PreliquidacionMensual[]> {
    let params = new HttpParams()
      .set('mes', mes)
      .set('anio', anio);

    if (empresaId != null) {
      params = params.set('empresaId', empresaId);
    }
    if (umbralHorasDiarias != null) {
      params = params.set('umbralHorasDiarias', umbralHorasDiarias);
    }

    return this.http.get<PreliquidacionMensual[]>(`${this.reportesApiUrl}/preliquidacion`, { params });
  }

  getExcepciones(
    desde: string,
    hasta: string,
    empresaId?: number,
    umbralHorasDiarias = 8,
    umbralJornadaExtrema = 12,
    horizonteDias = 90,
  ): Observable<ReporteExcepciones> {
    let params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta)
      .set('umbralHorasDiarias', umbralHorasDiarias)
      .set('umbralJornadaExtrema', umbralJornadaExtrema)
      .set('horizonteDias', horizonteDias);

    if (empresaId != null) {
      params = params.set('empresaId', empresaId);
    }

    return this.http.get<ReporteExcepciones>(`${this.reportesApiUrl}/excepciones`, { params });
  }
}
