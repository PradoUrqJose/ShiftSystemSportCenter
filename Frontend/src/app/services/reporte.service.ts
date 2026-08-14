import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Turno } from './turno.service';

// Los dos endpoints devuelven List<TurnoDTO> (backend) — el mismo shape que
// ya describe la interfaz Turno, no hace falta inventar una nueva. Antes
// ambos métodos devolvían Observable<any[]>, y ese `any` se filtraba a los
// componentes que los consumen (horas-trabajadas, turnos-feriados).
@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/turnos/reporte`;

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
}
