import { Injectable } from '@angular/core';
import { CalendarioService, DiaSemana } from './calendario.service';
import { TurnoStateService } from './turno-state.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { format, subMonths, addMonths } from 'date-fns';

@Injectable({
  providedIn: 'root',
})
export class SemanaService {
  constructor(
    // Antes le pedía las semanas del mes a TurnoService (un viaje HTTP al
    // backend solo para recalcular aritmética de fechas). CalendarioService
    // ya hace exactamente ese cálculo en el navegador para dibujar la
    // grilla — usar la misma fuente acá evita el viaje redundante y una
    // segunda implementación del mismo cálculo que podía desincronizarse.
    private calendarioService: CalendarioService,
    private turnoStateService: TurnoStateService
  ) {}

  cambiarSemana(direccion: 'anterior' | 'siguiente'): Observable<DiaSemana[]> {
    const semanaActual = this.turnoStateService.getSemanaActual();

    return this.calendarioService
      .obtenerSemanasDelMes(semanaActual)
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
        })
      );
  }

  private obtenerIndiceSemanaActual(semanas: DiaSemana[][]): number {
    const semanaActual = this.turnoStateService.getSemanaActual();

    return semanas.findIndex((semana) =>
      semana.some((dia) => dia.fecha === format(semanaActual, 'yyyy-MM-dd'))
    );
  }

  private cargarSemanaDeOtroMes(direccion: 'anterior' | 'siguiente'): Observable<DiaSemana[]> {
    const semanaActual = this.turnoStateService.getSemanaActual();

    const nuevaSemana =
      direccion === 'anterior'
        ? subMonths(semanaActual, 1)
        : addMonths(semanaActual, 1);

    this.turnoStateService.setSemanaActual(nuevaSemana);

    return this.calendarioService
      .obtenerSemanasDelMes(nuevaSemana)
      .pipe(
        switchMap((semanas) => {
          if (semanas.length > 0) {
            const semanaSeleccionada =
              direccion === 'anterior'
                ? semanas[semanas.length - 1]
                : semanas[0];
            return of(this.actualizarSemana(semanaSeleccionada));
          } else {
            throw new Error('No se encontraron semanas');
          }
        })
      );
  }

  private actualizarSemana(nuevaSemana: DiaSemana[]): DiaSemana[] {
    const primerDiaValido = nuevaSemana[0];

    if (primerDiaValido) {
      const [year, month, day] = primerDiaValido.fecha.split('-').map(Number);
      const nuevaFecha = new Date(year, month - 1, day);

      this.turnoStateService.setSemanaActual(nuevaFecha);
    }

    return nuevaSemana;
  }
}
