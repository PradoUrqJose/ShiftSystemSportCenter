import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Colaborador {
  id: number;
  nombre: string;
  dni: string;
  empresaId: number;
  empresaNombre: string; // Campo opcional para el nombre de la empresa
}

@Injectable({
  providedIn: 'root',
})
export class ColaboradorService {
  private apiUrl = 'http://localhost:8080/api/colaboradores';

  constructor(private http: HttpClient) {}

  getColaboradores(): Observable<Colaborador[]> {
    return this.http.get<Colaborador[]>(this.apiUrl);
  }

  getColaboradoresByEmpresa(empresaId: number): Observable<Colaborador[]> {
    return this.http.get<Colaborador[]>(
      `${this.apiUrl}/empresa/${empresaId}`
    );
  }

  addColaborador(colaborador: Colaborador): Observable<Colaborador> {
    return this.http.post<Colaborador>(this.apiUrl, colaborador);
  }

  updateColaborador(
    id: number,
    colaborador: Colaborador
  ): Observable<Colaborador> {
    return this.http.put<Colaborador>(
      `${this.apiUrl}/${id}`,
      colaborador
    );
  }

  deleteColaborador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
