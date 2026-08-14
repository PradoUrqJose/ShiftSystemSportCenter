import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse, PAGE_SIZE_ALL } from '../models/page-response.model';

export interface Empresa {
  id: number;
  nombre: string;
  ruc: string; // Agregar el atributo RUC
  numeroEmpleados: number; // Campo calculado de número de empleados
  habilitada: boolean; // Campo de estado de la empresa
}

@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private apiUrl = `${environment.apiUrl}/empresas`;

  constructor(private http: HttpClient) {}

  // GET /api/empresas devuelve paginado (Page<EmpresaDTO>) desde la Etapa 2
  // del backend. Pedimos una página grande para no truncar la lista mientras
  // no haya paginación real en la UI (ver PAGE_SIZE_ALL).
  getEmpresas(): Observable<Empresa[]> {
    return this.http
      .get<PageResponse<Empresa>>(this.apiUrl, {
        params: { size: PAGE_SIZE_ALL },
      })
      .pipe(map((page) => page.content));
  }

  addEmpresa(empresa: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(this.apiUrl, empresa);
  }

  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${id}`, empresa);
  }

  // En empresa.service.ts
  toggleHabilitacion(id: number, habilitada: boolean): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${id}/habilitacion`, null, {
      params: { habilitada: habilitada.toString() },
    });
  }

  getEmpresasPorHabilitacion(habilitada: boolean): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/filtro`, {
      params: { habilitada: habilitada.toString() },
    });
  }
}
