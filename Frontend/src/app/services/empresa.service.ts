import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.apiUrl);
  }

  addEmpresa(empresa: Empresa): Observable<Empresa> {
    return this.http.post<Empresa>(this.apiUrl, empresa);
  }

  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/${id}`, empresa);
  }

  deleteEmpresa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
