import { Injectable } from '@angular/core';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TurnoService } from './turno.service';
import { TurnoStateService } from './turno-state.service';
import { from, map, Observable, of, switchMap, toArray } from 'rxjs';

export interface DiaSemana {
  fecha: string;
  nombre: string;
  dayNumber: string;
  monthNombre: string;
  yearName: string;
  esFeriado?: boolean;
  esSobrante?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarioService {
  constructor(
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService) { }

  // ✅ Obtiene los días de una semana formateados como `DiaSemana[]`
  obtenerSemana(fecha: Date): Observable<DiaSemana[]> {
    const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 });
    const finSemana = endOfWeek(fecha, { weekStartsOn: 1 });

    const diasSemana = eachDayOfInterval({ start: inicioSemana, end: finSemana }).map((dia) => this.formatearDia(dia));
    console.log('Días de la semana:', diasSemana);

    return of(diasSemana); // Envuelve el resultado en un Observable
  }

  // ✅ Obtiene todas las semanas del mes formateadas como `DiaSemana[][]`
  obtenerSemanasDelMes(fecha: Date): Observable<DiaSemana[][]> {
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    console.log('Inicio del mes:', inicioMes);
    console.log('Fin del mes:', finMes);

    let inicioSemana = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const semanas: Date[] = [];

    // Generar las fechas de inicio de cada semana
    while (inicioSemana <= finMes || inicioSemana.getMonth() === fecha.getMonth()) {
      semanas.push(inicioSemana);
      inicioSemana = addDays(inicioSemana, 7);
    }

    // Convertir cada fecha en una semana Observable y combinarlas
    return from(semanas).pipe(
      switchMap((fechaSemana) =>
        this.obtenerSemana(fechaSemana).pipe(
          map((dias) =>
            dias.map((dia) => ({
              ...dia,
              esSobrante: dia.fecha < format(inicioMes, 'yyyy-MM-dd') || dia.fecha > format(finMes, 'yyyy-MM-dd'),
            }))
          )
        )
      ),
      toArray(), // Agrupa todas las semanas en un array
      map((semanasCompletas) => {
        console.log('Semanas del mes:', semanasCompletas);
        return semanasCompletas;
      })
    );
  }

  // ✅ Formatea un `Date` en un objeto `DiaSemana`
  private formatearDia(fecha: Date): DiaSemana {
    return {
      fecha: fecha.toISOString().split('T')[0], // yyyy-MM-dd
      nombre: format(fecha, 'EE', { locale: es }), // Lunes, Martes, etc.
      dayNumber: format(fecha, 'd'), // Día del mes
      monthNombre: format(fecha, 'MMMM', { locale: es }), // Nombre del mes
      yearName: format(fecha, 'yyyy'), // Año
    };
  }

  // ✅ Nuevo método: Obtener el nombre del mes
  obtenerNombreMes(fecha: Date): string {
    return format(fecha, 'MMMM yyyy', { locale: es });
  }

  // ✅ Nuevo método: Avanzar o retroceder un mes
  cambiarMes(fecha: Date, direccion: 'anterior' | 'siguiente'): Date {
    return direccion === 'anterior' ? subMonths(fecha, 1) : addMonths(fecha, 1);
  }

  // ✅ Formatea un número decimal de horas a formato HH:MM
  formatearHoras(horasTotales: number): string {
    if (!horasTotales || horasTotales < 0) return '00:00';

    const horas = Math.floor(horasTotales);
    const minutos = Math.round((horasTotales - horas) * 60) % 60;

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }

}
