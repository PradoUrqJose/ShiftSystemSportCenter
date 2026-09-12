import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse, PAGE_SIZE_ALL } from '../models/page-response.model';

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
  // Tienda que el modal de turno precarga al crear un turno nuevo (editable)
  tiendaPredeterminadaId?: number | null;
  tiendaPredeterminadaNombre?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ColaboradorService {
  private apiUrl = `${environment.apiUrl}/colaboradores`;

  constructor(private http: HttpClient) {}

  // GET /api/colaboradores devuelve paginado (Page<ColaboradorDTO>) desde la
  // Etapa 2 del backend. Pedimos una página grande para no truncar la lista
  // mientras no haya paginación real en la UI (ver PAGE_SIZE_ALL).
  getColaboradores(): Observable<Colaborador[]> {
    return this.http
      .get<PageResponse<Colaborador>>(this.apiUrl, {
        params: { size: PAGE_SIZE_ALL },
      })
      .pipe(map((page) => page.content));
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
