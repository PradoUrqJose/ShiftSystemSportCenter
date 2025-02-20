import { Injectable } from '@angular/core';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TurnoService } from './turno.service';
import { TurnoStateService } from './turno-state.service';

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
  obtenerSemana(fecha: Date): DiaSemana[] {
    const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 });
    const finSemana = endOfWeek(fecha, { weekStartsOn: 1 });

    console.log('Inicio de la semana:', inicioSemana);
    console.log('Fin de la semana:', finSemana);

    const diasSemana = eachDayOfInterval({ start: inicioSemana, end: finSemana }).map((dia) => this.formatearDia(dia));
    console.log('Días de la semana:', diasSemana);

    return diasSemana;
  }

  // ✅ Obtiene todas las semanas del mes formateadas como `DiaSemana[][]`
  obtenerSemanasDelMes(fecha: Date): DiaSemana[][] {
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    console.log('Inicio del mes:', inicioMes);
    console.log('Fin del mes:', finMes);

    let semanas: DiaSemana[][] = [];
    let inicioSemana = startOfWeek(inicioMes, { weekStartsOn: 1 });

    while (inicioSemana <= finMes || inicioSemana.getMonth() === fecha.getMonth()) {
      const semana = this.obtenerSemana(inicioSemana).map((dia) => ({
        ...dia,
        esSobrante: dia.fecha < format(inicioMes, 'yyyy-MM-dd') || dia.fecha > format(finMes, 'yyyy-MM-dd'),
      }));

      console.log('Semana:', semana);

      semanas.push(semana);
      inicioSemana = addDays(inicioSemana, 7); // ✅ Pasar a la siguiente semana
    }

    console.log('Semanas del mes:', semanas);

    return semanas;
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
