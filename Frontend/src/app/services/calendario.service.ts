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
    return of(diasSemana); // Envuelve el resultado en un Observable
  }

  // ✅ Obtiene todas las semanas del mes formateadas como `DiaSemana[][]`
  obtenerSemanasDelMes(fecha: Date): Observable<DiaSemana[][]> {
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

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

  // ✅ Determina si una fecha (yyyy-MM-dd) es el día de hoy.
  // Antes esta misma lógica estaba copiada tal cual en turnos.component.ts,
  // weekly-view.component.ts y monthly-view.component.ts.
  esDiaActual(fecha: string): boolean {
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaComparar = new Date(year, month - 1, day); // Meses son 0-indexados en JavaScript
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);
    return hoy.getTime() === fechaComparar.getTime();
  }

  // ✅ Formatea un número decimal de horas a formato HH:MM
  formatearHoras(horasTotales: number, type?: boolean): string {
    if (!horasTotales || horasTotales < 0) return '00:00';

    const horas = Math.floor(horasTotales);
    const minutos = Math.round((horasTotales - horas) * 60) % 60;
    if(type){
      return `${String(horas).padStart(1, '0')}.${String(minutos).padStart(2, '0')}`;
    }
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  }

  //! UTILIDAD
  //? ----------------------> Método Completar Semana y mes con celdas Vacías

  completarSemanasDelMes(semanas: DiaSemana[][], mesActual: number, anioActual: number): DiaSemana[][] {
    if (!semanas || semanas.length === 0) return [];

    return semanas.map((semana, index) => {
      let semanasCompletadas = [...semana];

      // 📌 Agregar días del mes anterior si la primera semana no empieza en lunes
      if (index === 0) {
        const primerDiaReal = new Date(semana[0].fecha);
        const diaSemana = primerDiaReal.getDay(); // 0 (Domingo) - 6 (Sábado)

        if (diaSemana > 0) { // Si no es lunes
          const mesPrevio = mesActual === 1 ? 12 : mesActual - 1;
          const anioPrevio = mesActual === 1 ? anioActual - 1 : anioActual;
          const diasMesPrevio = new Date(anioPrevio, mesPrevio, 0).getDate(); // Último día del mes anterior

          const diasSobrantes = [];
          for (let i = diaSemana - 1; i >= 0; i--) {
            diasSobrantes.push({
              fecha: `${anioPrevio}-${String(mesPrevio).padStart(2, "0")}-${String(diasMesPrevio - i).padStart(2, "0")}`,
              nombre: format(new Date(anioPrevio, mesPrevio - 1, diasMesPrevio - i), "EEE", { locale: es }),
              dayNumber: String(diasMesPrevio - i),
              monthNombre: format(new Date(anioPrevio, mesPrevio - 1, 1), "MMMM", { locale: es }),
              yearName: String(anioPrevio),
              esSobrante: true, // 🔴 Indica que es del mes anterior
            });
          }
          semanasCompletadas = [...diasSobrantes, ...semanasCompletadas]; // Asegura el orden correcto
        }
      }

      // 📌 Agregar días del mes siguiente si la última semana no termina en domingo
      if (index === semanas.length - 1) {
        const ultimoDiaReal = new Date(semanasCompletadas[semanasCompletadas.length - 1].fecha);
        let siguienteDia = new Date(ultimoDiaReal);
        siguienteDia.setDate(1); // 📌 Asegurar que empieza en el primer día del mes siguiente

        const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;
        const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual;

        while (semanasCompletadas.length < 7) {
          semanasCompletadas.push({
            fecha: `${anioSiguiente}-${String(mesSiguiente).padStart(2, "0")}-${String(siguienteDia.getDate()).padStart(2, "0")}`,
            nombre: format(siguienteDia, "EEE", { locale: es }),
            dayNumber: format(siguienteDia, "d"),
            monthNombre: format(siguienteDia, "MMMM", { locale: es }),
            yearName: format(siguienteDia, "yyyy"),
            esSobrante: true, // 🔴 Indica que es del mes siguiente
          });
          siguienteDia.setDate(siguienteDia.getDate() + 1);
        }
      }

      return semanasCompletadas;
    });
  }

  obtenerSemanasDelMesConCompletado(fecha: Date): Observable<DiaSemana[][]> {
    return this.obtenerSemanasDelMes(fecha).pipe(
      map((semanas) => {
        const semanasCompletadas = this.completarSemanasDelMes(semanas, fecha.getMonth() + 1, fecha.getFullYear());
        return semanasCompletadas;
      })
    );
  }
  //? ---------------------->

}
