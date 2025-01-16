import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Empresa {
  id: number;
  nombre: string;
  ruc: string; // Agregar el atributo RUC
  numeroEmpleados: number; // Campo calculado de número de empleados
}


@Injectable({
  providedIn: 'root',
})
export class EmpresaService {
  private apiUrl = 'http://localhost:8080/api/empresas';

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
}
