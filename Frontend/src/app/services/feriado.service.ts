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

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(this.apiUrl);
  }
}
