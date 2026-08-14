import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  // Los errores HTTP ya llegan normalizados con un mensaje amigable desde
  // errorInterceptor (ver interceptors/error.interceptor.ts).

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(this.apiUrl);
  }

  isFeriado(fecha: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/es-feriado`, { params: { fecha } });
  }
}
