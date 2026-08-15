import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageResponse, PAGE_SIZE_ALL } from '../models/page-response.model';

export interface Tienda {
  id?: number; // Opcional al crear una nueva tienda
  nombre: string;
  direccion?: string; // Opcional según el backend
}

@Injectable({
  providedIn: 'root',
})
export class TiendaService {
  private apiUrl = `${environment.apiUrl}/tiendas`;

  constructor(private http: HttpClient) {}

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts) — no hace
  // falta un catchError propio por método acá.

  // GET /api/tiendas devuelve paginado (Page<TiendaDTO>) desde la Etapa 2 del
  // backend. Pedimos una página grande para no truncar la lista mientras no
  // haya paginación real en la UI (ver PAGE_SIZE_ALL).
  getTiendas(): Observable<Tienda[]> {
    return this.http
      .get<PageResponse<Tienda>>(this.apiUrl, { params: { size: PAGE_SIZE_ALL } })
      .pipe(map((page) => page.content));
  }

  addTienda(tienda: Tienda): Observable<Tienda> {
    return this.http.post<Tienda>(this.apiUrl, tienda);
  }

  updateTienda(id: number, tienda: Tienda): Observable<Tienda> {
    return this.http.put<Tienda>(`${this.apiUrl}/${id}`, tienda);
  }

  deleteTienda(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
