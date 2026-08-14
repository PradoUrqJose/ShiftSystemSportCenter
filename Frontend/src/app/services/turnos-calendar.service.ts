import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject, Subscription, takeUntil } from 'rxjs';
import { format, startOfMonth } from 'date-fns';
import { CalendarioService, DiaSemana } from './calendario.service';
import { SemanaService } from './semana.service';
import { Turno, TurnoService } from './turno.service';
import { TurnoStateService } from './turno-state.service';

// Orquestación de "qué semana/mes se está mostrando y qué turnos trae" —
// extraído de turnos.component.ts, que mezclaba esto con el modal de alta/
// edición y los filtros de la barra superior. Sin providedIn: 'root': se
// declara en el `providers` de TurnosComponent (ver ngModule del
// componente), mismo criterio que ReporteFiltrosService/TooltipService en
// esta misma limpieza — un estado por instancia de página, no uno global.
@Injectable()
export class TurnosCalendarService implements OnDestroy {
  turnos$: Observable<Turno[]> = of([]);
  turnosMensuales$: Observable<Turno[]> = of([]);
  diasSemana$ = new BehaviorSubject<DiaSemana[]>([]);
  semanasDelMes: DiaSemana[][] = [];
  vistaMensual = false;
  colaboradorSeleccionado = 0;
  mes = 0;
  anio = 0;
  nombreMesActual = '';
  readonly isLoading$: Observable<boolean>;

  private turnosSubscription?: Subscription;
  private turnosMensualesSubscription?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService,
    private calendarioService: CalendarioService,
    private semanaService: SemanaService
  ) {
    this.isLoading$ = this.turnoStateService.isLoading$;
    this.actualizarMesAnio();
    this.actualizarNombreMes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Arranque inicial: vista semanal, escuchando el estado global de
  // vista mensual/semanal (compartido con otras páginas vía TurnoStateService).
  inicializar(): void {
    this.turnoStateService.vistaMensual$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.vistaMensual = value;
    });
    this.vistaMensual = false;
    this.cargarSemana();
  }

  toggleVistaMensual(data: string): void {
    const nuevaVistaMensual = data === 'month';
    this.turnoStateService.setVistaMensual(nuevaVistaMensual);

    if (nuevaVistaMensual) {
      const nuevaSemana = startOfMonth(this.turnoStateService.getSemanaActual());
      this.turnoStateService.setSemanaActual(nuevaSemana);
      this.cargarMes();
    } else {
      this.cargarSemana();
    }

    this.actualizarNombreMes();
  }

  cargarSemana(): void {
    this.turnoStateService.setLoading(true);
    const semanaActual = this.turnoStateService.getSemanaActual();

    this.calendarioService.obtenerSemanasDelMes(semanaActual).pipe(takeUntil(this.destroy$)).subscribe({
      next: (semanas) => {
        const semanaSeleccionada = semanas.find((semana) =>
          semana.some((dia) => dia.fecha === format(semanaActual, 'yyyy-MM-dd'))
        ) || semanas[0];
        this.diasSemana$.next(semanaSeleccionada);

        this.turnosSubscription?.unsubscribe();
        this.turnos$ = this.cargarTurnosDeSemana(semanaSeleccionada);
        this.turnoStateService.setLoading(false);
      },
      error: () => {
        this.turnos$ = of([]);
        this.diasSemana$.next([]);
        this.turnoStateService.setLoading(false);
      },
    });

    this.actualizarNombreMes();
  }

  cargarMes(): void {
    this.turnoStateService.setLoading(true);
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.calendarioService.obtenerSemanasDelMesConCompletado(semanaActual).pipe(takeUntil(this.destroy$)).subscribe({
      next: (semanas) => {
        this.semanasDelMes = semanas;
        this.turnoStateService.setLoading(false);
        this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      },
      error: () => {
        this.semanasDelMes = [];
        this.turnoStateService.setLoading(false);
      },
    });
  }

  mostrarTurnosMensuales(colaboradorId: number): void {
    if (!colaboradorId) return;
    this.colaboradorSeleccionado = colaboradorId;
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.turnosMensualesSubscription?.unsubscribe();
    this.turnosMensuales$ = this.turnoService.getTurnosMensualesPorColaborador(
      colaboradorId,
      semanaActual.getMonth() + 1,
      semanaActual.getFullYear()
    );
    this.semanasDelMes = this.calendarioService.completarSemanasDelMes(
      this.semanasDelMes,
      semanaActual.getMonth() + 1,
      semanaActual.getFullYear()
    );
  }

  actualizarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
    }
  }

  // Turnos de una semana ya resuelta (7 días con fecha real, Lunes a
  // Domingo) — reemplaza a pedirle al backend "la semana número N del mes"
  // (ver turno.service.ts). Reutilizado por cargarSemana, cambiarSemana y
  // manejarTurnoGuardado (llamado desde el componente).
  cargarTurnosDeSemana(semana: DiaSemana[]): Observable<Turno[]> {
    const inicio = semana[0].fecha;
    const fin = semana[semana.length - 1].fecha;
    return this.turnoService.getTurnosPorRangoFecha(inicio, fin);
  }

  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    const nuevaFecha = this.calendarioService.cambiarMes(this.turnoStateService.getSemanaActual(), direccion);
    this.turnoStateService.setSemanaActual(nuevaFecha);
    this.cargarMes();
    this.actualizarNombreMes();
    this.actualizarMesAnio();
  }

  // A diferencia del resto, necesita avisarle al componente cuándo terminó
  // (para que fuerce detectChanges en el momento justo, igual que hacía
  // antes) — por eso recibe un callback en vez de ser "fire and forget"
  // como cargarMes/cargarSemana.
  cambiarSemana(direccion: 'anterior' | 'siguiente', onCompletado: () => void): void {
    this.turnoStateService.setLoading(true);
    this.semanaService.cambiarSemana(direccion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (nuevaSemana) => {
        this.diasSemana$.next(nuevaSemana);
        this.turnos$ = this.cargarTurnosDeSemana(nuevaSemana);
        this.actualizarNombreMes();
        this.actualizarMesAnio();
        this.turnoStateService.setLoading(false);
        onCompletado();
      },
      error: () => {
        this.turnoStateService.setLoading(false);
      },
    });
  }

  private actualizarMesAnio(): void {
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.mes = semanaActual.getMonth() + 1; // getMonth() devuelve 0-11, sumamos 1 para 1-12
    this.anio = semanaActual.getFullYear();
  }

  actualizarNombreMes(): void {
    this.nombreMesActual = this.calendarioService.obtenerNombreMes(this.turnoStateService.getSemanaActual());
  }
}
