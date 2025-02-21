import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Colaborador {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  empresaId: number;
  empresaNombre: string; // Campo opcional para el nombre de la empresa
  fotoUrl?: string; // URL de la foto
  habilitado: boolean; // Campo de estado del colaborador
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
    return this.http.get<Colaborador[]>(`${this.apiUrl}/empresa/${empresaId}`);
  }

  addColaborador(
    colaborador: Colaborador,
    file?: File
  ): Observable<Colaborador> {
    const formData = new FormData();
    formData.append(
      'colaborador',
      new Blob([JSON.stringify(colaborador)], { type: 'application/json' })
    );
    if (file) {
      formData.append('file', file); // Añade el archivo si está presente
    }
    return this.http.post<Colaborador>(this.apiUrl, formData);
  }

  updateColaborador(
    id: number,
    colaborador: Colaborador,
    file?: File
  ): Observable<Colaborador> {
    const formData = new FormData();
    formData.append(
      'colaborador',
      new Blob([JSON.stringify(colaborador)], { type: 'application/json' })
    );
    if (file) {
      formData.append('file', file); // Añade el archivo si está presente
    }
    return this.http.put<Colaborador>(`${this.apiUrl}/${id}`, formData);
  }

  deleteColaborador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleHabilitacion(id: number, habilitado: boolean): Observable<Colaborador> {
    return this.http.put<Colaborador>(
      `${this.apiUrl}/${id}/habilitacion`,
      null,
      {
        params: { habilitado: habilitado.toString() },
      }
    );
  }

  getColaboradoresPorHabilitacion(
    habilitado: boolean
  ): Observable<Colaborador[]> {
    return this.http.get<Colaborador[]>(`${this.apiUrl}/filtro`, {
      params: { habilitado: habilitado.toString() },
    });
  }

  // Método añadido para obtener un colaborador por ID
  getColaboradorById(id: number): Observable<Colaborador> {
    return this.http.get<Colaborador>(`${this.apiUrl}/${id}`);
  }

  // Método existente que ya tienes
  getTurnosByColaboradorId(id: number): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/turnos/${id}`);
  }
}
