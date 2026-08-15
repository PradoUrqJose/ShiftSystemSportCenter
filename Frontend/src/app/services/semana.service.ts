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
    // Se ancla al PRIMER día no-sobrante de la semana, no al lunes fijo ni
    // a un día fijo como el jueves.
    //
    // La semana física que cruza de mes (ej. lun 31 ago - dom 6 sep) se
    // muestra dos veces al navegar hacia adelante, con dos "sabores"
    // distintos, cada uno con su propio recorte de días editables:
    //  1) como cola de agosto (obtenerSemanasDelMes(agosto)): 31 ago real,
    //     1-6 sep sobrantes/no editables.
    //  2) como cabecera de septiembre (obtenerSemanasDelMes(septiembre)):
    //     1-6 sep reales, 31 ago sobrante/no editable.
    // Anclar al lunes (bug original) siempre da 31 ago sin importar el
    // sabor, así que el estado queda leído como "agosto" en los dos casos:
    // avanzar recalcula sobre la lista de agosto de nuevo y rebota ahí
    // para siempre. Anclar a un día fijo como el jueves sí distingue mes,
    // pero el jueves de esta semana (3 sep) cae dentro de la lista de
    // septiembre en AMBOS sabores, así que el segundo click cree que el
    // sabor "cabecera de septiembre" ya se mostró y salta directo a la
    // semana siguiente (7-13 sep), sin renderizarlo nunca. El primer día
    // real de la semana sí distingue los dos sabores (31 ago vs. 1 sep) y
    // además, para una semana totalmente interior sin cruce de mes, es
    // simplemente el lunes — mismo comportamiento de siempre. Bug
    // reportado 14 ago 2026, fix revisado el mismo día tras encontrar que
    // el ancla fija (jueves) se saltaba el segundo sabor.
    const diaAncla = nuevaSemana.find((dia) => !dia.esSobrante) ?? nuevaSemana[0];

    if (diaAncla) {
      const [year, month, day] = diaAncla.fecha.split('-').map(Number);
      const nuevaFecha = new Date(year, month - 1, day);

      this.turnoStateService.setSemanaActual(nuevaFecha);
    }

    return nuevaSemana;
  }
}
