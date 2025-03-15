import { Injectable } from '@angular/core';
import { TurnoService } from './turno.service';
import { TurnoStateService } from './turno-state.service';
import { DiaSemana } from './calendario.service';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { format, subMonths, addMonths } from 'date-fns';

@Injectable({
  providedIn: 'root',
})
export class SemanaService {
  constructor(
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService
  ) {}

  cambiarSemana(direccion: 'anterior' | 'siguiente'): Observable<{ nuevaSemana: DiaSemana[]; turnos: any[] }> {
    const semanaActual = this.turnoStateService.getSemanaActual();

    return this.turnoService
      .getSemanasDelMes(semanaActual.getMonth() + 1, semanaActual.getFullYear())
      .pipe(
        switchMap((semanas) => {
          let indiceSemanaActual = this.obtenerIndiceSemanaActual(semanas);

          if (direccion === 'anterior') {
            if (indiceSemanaActual > 0) {
              indiceSemanaActual--;
            } else {
              return this.cargarSemanaDeOtroMes('anterior');
            }
          } else {
            if (indiceSemanaActual < semanas.length - 1) {
              indiceSemanaActual++;
            } else {
              return this.cargarSemanaDeOtroMes('siguiente');
            }
          }

          return of(this.actualizarSemana(semanas[indiceSemanaActual]));
        }),
        catchError((error) => {
          throw error;
        })
      );
  }

  private obtenerIndiceSemanaActual(semanas: DiaSemana[][]): number {
    const semanaActual = this.turnoStateService.getSemanaActual();

    return semanas.findIndex((semana) =>
      semana.some(
        (dia) =>
          dia.fecha !== 'filler' &&
          dia.fecha === format(semanaActual, 'yyyy-MM-dd')
      )
    );
  }

  private cargarSemanaDeOtroMes(direccion: 'anterior' | 'siguiente'): Observable<{ nuevaSemana: DiaSemana[]; turnos: any[] }> {
    const semanaActual = this.turnoStateService.getSemanaActual();

    const nuevaSemana =
      direccion === 'anterior'
        ? subMonths(semanaActual, 1)
        : addMonths(semanaActual, 1);

    this.turnoStateService.setSemanaActual(nuevaSemana);

    return this.turnoService
      .getSemanasDelMes(nuevaSemana.getMonth() + 1, nuevaSemana.getFullYear())
      .pipe(
        switchMap((semanas) => {
          if (semanas.length > 0) {
            const semanaSeleccionada =
              direccion === 'anterior'
                ? semanas[semanas.length - 1]
                : semanas[0];
            return of(this.actualizarSemana(semanaSeleccionada));
          } else {
            console.warn(
              `⚠️ No se encontraron semanas en el mes ${direccion === 'anterior' ? 'anterior' : 'siguiente'}.`
            );
            throw new Error('No se encontraron semanas');
          }
        }),
        catchError((error) => {
          console.error(
            `❌ Error al cargar semanas del mes ${direccion === 'anterior' ? 'anterior' : 'siguiente'}:`,
            error
          );
          throw error;
        })
      );
  }

  private actualizarSemana(nuevaSemana: DiaSemana[]): { nuevaSemana: DiaSemana[]; turnos: any[] } {
    const primerDiaValido = nuevaSemana.find((dia) => dia.fecha !== 'filler');

    if (primerDiaValido) {
      const [year, month, day] = primerDiaValido.fecha.split('-').map(Number);
      const nuevaFecha = new Date(year, month - 1, day);

      this.turnoStateService.setSemanaActual(nuevaFecha);
    }

    return {
      nuevaSemana,
      turnos: [] // Aquí puedes devolver los turnos si es necesario
    };
  }
}
