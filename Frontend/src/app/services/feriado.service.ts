import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Feriado {
  fecha: string; // Formato YYYY-MM-DD
  descripcion: string;
}

@Injectable({
  providedIn: 'root',
})
export class FeriadoService {
  private apiUrl = 'http://localhost:8080/api/feriados'; // Ajusta según tu backend

  constructor(private http: HttpClient) {}

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(this.apiUrl);
  }
}
