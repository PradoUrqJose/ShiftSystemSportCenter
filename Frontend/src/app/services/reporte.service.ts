import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/turnos/reporte`;

  constructor(private http: HttpClient) { }

  // Reporte de horas trabajadas por colaboradores (sin cambios)
  getHorasTrabajadas(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));
    }

    console.log('✅ Parámetros enviados al backend (Horas Trabajadas):', { fechaInicio, fechaFin, colaboradores: colaboradores.join(',') });

    return this.http.get<any[]>(this.apiUrl, { params });
  }

  // Reporte de turnos en feriados (MODIFICADO)
  getTurnosFeriados(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));
    }

    console.log('✅ Parámetros enviados al backend (Turnos Feriados):', { fechaInicio, fechaFin, colaboradores: colaboradores.join(',') });

    return this.http.get<any[]>(`${this.apiUrl}/feriados`, { params });
  }

  // Reporte de horas extra (MODIFICADO)
  getHorasExtras(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));
    }

    console.log('✅ Parámetros enviados al backend (Horas Extras):', { fechaInicio, fechaFin, colaboradores: colaboradores.join(',') });

    return this.http.get<any[]>(`${this.apiUrl}/horas-extra`, { params });
  }
}
