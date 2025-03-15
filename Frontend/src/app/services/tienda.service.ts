import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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

  getTiendas(): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(this.apiUrl).pipe(
      catchError((err) => {
        return throwError(() => new Error(err.error || 'No se pudieron cargar las tiendas.'));
      })
    );
  }

  addTienda(tienda: Tienda): Observable<Tienda> {
    return this.http.post<Tienda>(this.apiUrl, tienda).pipe(
      catchError((err) => {
        return throwError(() => new Error(err.error || 'Error al agregar la tienda.'));
      })
    );
  }

  updateTienda(id: number, tienda: Tienda): Observable<Tienda> {
    return this.http.put<Tienda>(`${this.apiUrl}/${id}`, tienda).pipe(
      catchError((err) => {
        return throwError(() => new Error(err.error || 'Error al actualizar la tienda.'));
      })
    );
  }

  deleteTienda(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((err) => {
        return throwError(() => new Error(err.error || 'Error al eliminar la tienda.'));
      })
    );
  }
}
