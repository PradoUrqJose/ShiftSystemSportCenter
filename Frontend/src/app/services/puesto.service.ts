import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  getPuestos(): Observable<Puesto[]> {
    return this.http.get<Puesto[]>(this.apiUrl);
  }

  getPuestoById(id: number): Observable<Puesto> {
    return this.http.get<Puesto>(`${this.apiUrl}/${id}`).pipe(
      map(puesto => ({ ...puesto, id: Number(puesto.id) }))
    );
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
