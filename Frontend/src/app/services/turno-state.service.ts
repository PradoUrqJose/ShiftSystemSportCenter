import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TurnoStateService {
  // Estado de carga
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSubject.asObservable();

  // Estado de la vista mensual/semanal
  private vistaMensualSubject = new BehaviorSubject<boolean>(false);
  vistaMensual$ = this.vistaMensualSubject.asObservable();

  // Semana actual
  private semanaActualSubject = new BehaviorSubject<Date>(new Date());
  semanaActual$ = this.semanaActualSubject.asObservable();

  constructor() {}

  // Métodos para actualizar el estado
  setLoading(value: boolean): void {
    this.isLoadingSubject.next(value);
  }

  setVistaMensual(value: boolean): void {
    this.vistaMensualSubject.next(value);
  }

  setSemanaActual(fecha: Date): void {
    this.semanaActualSubject.next(fecha);
  }

  getSemanaActual(): Date {
    return this.semanaActualSubject.getValue();
  }
}
