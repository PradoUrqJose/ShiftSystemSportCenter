import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface Feriado {
  fecha: string; // Formato YYYY-MM-DD
  descripcion: string;
}

@Injectable({
  providedIn: 'root',
})
export class FeriadoService {
  private apiUrl = `${environment.apiUrl}/feriados`;

  constructor(private http: HttpClient) {}

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(this.apiUrl).pipe(
      catchError(err => {
        console.error('Error al obtener feriados:', err);
        return throwError(() => new Error('No se pudieron cargar los feriados'));
      })
    );
  }

  isFeriado(fecha: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/es-feriado`, { params: { fecha } }).pipe(
      catchError(err => {
        console.error('Error al verificar feriado:', err);
        return throwError(() => new Error('Error al verificar si es feriado'));
      })
    );
  }
}
