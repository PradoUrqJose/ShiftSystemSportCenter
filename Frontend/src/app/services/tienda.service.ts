import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Tienda {
  id: number;
  nombre: string;
  direccion: string;
}

@Injectable({
  providedIn: 'root',
})
export class TiendaService {
  private apiUrl = 'http://localhost:8080/api/tiendas';

  constructor(private http: HttpClient) {}

  getTiendas(): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error al obtener tiendas:', error);
        return throwError(
          () =>
            new Error('No se pudieron cargar las tiendas. Intente más tarde.')
        );
      })
    );
  }

  addTienda(tienda: Tienda): Observable<Tienda> {
    return this.http.post<Tienda>(this.apiUrl, tienda).pipe(
      catchError((error) => {
        console.error('Error al agregar tienda:', error);
        return throwError(
          () => new Error('No se pudo agregar la tienda. Intente más tarde.')
        );
      })
    );
  }

  updateTienda(id: number, tienda: Tienda): Observable<Tienda> {
    return this.http.put<Tienda>(`${this.apiUrl}/${id}`, tienda).pipe(
      catchError((error) => {
        console.error('Error al actualizar tienda:', error);
        return throwError(
          () => new Error('No se pudo actualizar la tienda. Intente más tarde.')
        );
      })
    );
  }

  deleteTienda(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error al eliminar tienda:', error);
        return throwError(
          () => new Error('No se pudo eliminar la tienda. Intente más tarde.')
        );
      })
    );
  }
}
