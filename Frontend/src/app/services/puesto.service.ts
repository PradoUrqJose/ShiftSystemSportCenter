import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse, PAGE_SIZE_ALL } from '../models/page-response.model';

export interface Puesto {
  id?: number;
  nombre: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PuestoService {
  private apiUrl = `${environment.apiUrl}/puestos`;

  constructor(private http: HttpClient) {}

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts) — no hace
  // falta un catchError propio por método acá.

  // GET /api/puestos devuelve paginado (Page<PuestoDTO>) desde la Etapa 2 del
  // backend. Pedimos una página grande para no truncar la lista mientras no
  // haya paginación real en la UI (ver PAGE_SIZE_ALL).
  getPuestos(): Observable<Puesto[]> {
    return this.http
      .get<PageResponse<Puesto>>(this.apiUrl, { params: { size: PAGE_SIZE_ALL } })
      .pipe(map((page) => page.content));
  }

  getPuestoById(id: number): Observable<Puesto> {
    return this.http.get<Puesto>(`${this.apiUrl}/${id}`);
  }

  addPuesto(puesto: Puesto): Observable<Puesto> {
    return this.http.post<Puesto>(this.apiUrl, puesto);
  }

  updatePuesto(id: number, puesto: Puesto): Observable<Puesto> {
    return this.http.put<Puesto>(`${this.apiUrl}/${id}`, puesto);
  }

  deletePuesto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
