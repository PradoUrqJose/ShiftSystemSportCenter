import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = 'http://localhost:8080/api/turnos/reporte'; // ✅ URL corregida

  constructor(private http: HttpClient) { }

  getHorasTrabajadas(fechaInicio: string, fechaFin: string, colaboradores: number[]): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);

    if (colaboradores.length > 0) {
      params = params.set('colaboradores', colaboradores.join(','));  // 🔥 Convertimos los IDs a string separados por comas
    }

    console.log('✅ Parámetros enviados al backend:', { fechaInicio, fechaFin, colaboradores: colaboradores.join(',') });

    return this.http.get<any[]>(this.apiUrl, { params });
  }

  getTurnosFeriados(fechaInicio: string, fechaFin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/feriados?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
  }

  getHorasExtras(fechaInicio: string, fechaFin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/horas-extra?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
  }
}
