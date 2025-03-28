import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Colaborador {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  empresaId: number;
  empresaNombre: string;
  fotoUrl?: string;
  habilitado: boolean;
  fechaNacimiento?: string; // Usamos string porque JSON serializa LocalDate como "YYYY-MM-DD"
  puestoId?: number;        // ID del puesto asignado
  puestoNombre?: string;    // Nombre del puesto
}

@Injectable({
  providedIn: 'root',
})
export class ColaboradorService {
  private apiUrl = `${environment.apiUrl}/colaboradores`;

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

}
