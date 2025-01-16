// turno.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Colaborador } from './colaborador.service';
import { format } from 'date-fns';

export interface Turno {
  id?: number;
  colaborador: Colaborador; // Asegúrate de que aquí se usa el objeto completo
  fecha: string;
  horaEntrada: string;
  horaSalida: string;
  horasTrabajadas?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private apiUrl = 'http://localhost:8080/api/turnos';

  constructor(private http: HttpClient) {}

  getTurnosPorSemana(fecha: Date): Observable<Turno[]> {
    const formattedDate = format(fecha, 'yyyy-MM-dd'); // Asegúrate de que el formato sea correcto
    console.log(`Fetching turnos for date: ${formattedDate}`);
    return this.http.get<Turno[]>(`${this.apiUrl}?fecha=${formattedDate}`);
  }


  addTurno(turno: Turno): Observable<Turno> {
    return this.http.post<Turno>(this.apiUrl, turno);
  }

  updateTurno(id: number, turno: Turno): Observable<Turno> {
    return this.http.put<Turno>(`${this.apiUrl}/${id}`, turno);
  }

  deleteTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
