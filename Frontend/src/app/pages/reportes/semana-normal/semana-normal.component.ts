import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, map, take, takeUntil } from 'rxjs';
import { WeeklyViewComponent } from '../../turnos/weekly-view/weekly-view.component';
import { DiaSemana } from '../../../services/calendario.service';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { Turno, TurnoService, crearTurnoVacio } from '../../../services/turno.service';
import { TurnoStateService } from '../../../services/turno-state.service';
import { HeaderComponent } from '../../turnos/header/header.component';
import { CommonModule } from '@angular/common';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { RouterModule } from '@angular/router';
import { TurnoModalComponent } from '../../turnos/turno-modal/turno-modal.component'; // Importar el modal
import { ModalService } from '../../../services/modal.service';
import { TiendaService } from '../../../services/tienda.service';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';
import { WeeklyScheduleSkeletonComponent } from '../../../components/ui/weekly-schedule-skeleton/weekly-schedule-skeleton.component';

@Component({
    selector: 'app-semana-normal',
    imports: [WeeklyViewComponent, HeaderComponent, CommonModule, RouterModule, TurnoModalComponent, WeeklyScheduleSkeletonComponent],
    templateUrl: './semana-normal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./semana-normal.component.css']
})
export class SemanaNormalComponent implements OnInit, OnDestroy {
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = '';

  diasSemana$ = new BehaviorSubject<DiaSemana[]>([]);
  turnos$!: Observable<Turno[]>;
  colaboradores: Colaborador[] = [];

  // Propiedades para el modal
  mostrarModal$!: Observable<boolean>;
  isModalVisible$!: Observable<boolean>;
  turnoActual: Turno = crearTurnoVacio();
  turnoOriginal: Turno | null = null;
  // Turnos del mismo colaborador+fecha que turnoActual (ver turnos.component.ts)
  turnosDelDiaActual: Turno[] = [];
  tiendas$!: Observable<any[]>;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private colaboradorService: ColaboradorService,
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService,
    private modalService: ModalService,
    private tiendaService: TiendaService
  ) {
    this.isLoading$ = this.turnoStateService.isLoading$;
    this.nombreMesActual = format(this.turnoStateService.getSemanaActual(), 'MMMM yyyy', { locale: es });
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.tiendas$ = this.tiendaService.getTiendas(); // Inicializar tiendas$
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para cargar datos iniciales
  cargarDatos(): void {
    this.turnoStateService.setLoading(true);
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.cargarSemanaNormal(semanaActual);

    this.colaboradorService.getColaboradoresPorHabilitacion(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (colaboradores) => {
        this.colaboradores = colaboradores;
        this.turnoStateService.setLoading(false);
      },
      error: () => {
        this.turnoStateService.setLoading(false);
      }
    });
  }

  // Método para cargar una semana normal (lunes a domingo)
  private cargarSemanaNormal(fecha: Date): void {
    const diasSemana = this.obtenerDiasSemanaNormal(fecha);
    this.diasSemana$.next(diasSemana);

    this.turnos$ = this.turnoService.getTurnosPorSemana(fecha);
    this.turnos$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        setTimeout(() => this.inicializarTooltips(), 500);
        this.turnoStateService.setLoading(false);
      },
      error: () => {
        this.turnoStateService.setLoading(false);
      }
    });

    this.actualizarNombreMes();
  }

  // Método auxiliar para calcular días de la semana localmente (lunes a domingo)
  private obtenerDiasSemanaNormal(fecha: Date): DiaSemana[] {
    const inicioSemana = startOfWeek(fecha, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: inicioSemana,
      end: addDays(inicioSemana, 6)
    }).map((dia) => ({
      fecha: format(dia, 'yyyy-MM-dd'),
      nombre: format(dia, 'EEE', { locale: es }),
      dayNumber: format(dia, 'd'),
      monthNombre: format(dia, 'MMMM', { locale: es }),
      yearName: format(dia, 'yyyy'),
    }));
  }

  // Método para manejar la navegación entre semanas
  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.turnoStateService.setLoading(true);

    const semanaActual = this.turnoStateService.getSemanaActual();
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 7 : -7));

    this.turnoStateService.setSemanaActual(nuevaFecha);
    this.cargarSemanaNormal(nuevaFecha);
  }

  // Métodos de UI
  actualizarNombreMes(): void {
    this.nombreMesActual = format(this.turnoStateService.getSemanaActual(), 'MMMM yyyy', { locale: es });
  }

  inicializarTooltips(): void {
    // Implementar lógica de tooltips si es necesario
  }

  // Métodos para el modal
  abrirModal(event: { colaboradorId: number; fecha: string }): void {
    this.resetearEstadoModal();
    this.colaboradorService.getColaboradoresPorHabilitacion(true)
      .pipe(
        map((colaboradores) => colaboradores.find((c) => c.id === event.colaboradorId)),
        takeUntil(this.destroy$)
      )
      .subscribe((col) => {
        if (col) {
          this.turnoActual = {
            id: 0,
            nombreColaborador: col.nombre,
            dniColaborador: col.dni,
            nombreEmpresa: col.empresaNombre,
            empresaId: col.empresaId,
            colaboradorId: col.id,
            fecha: event.fecha,
            horaEntrada: '',
            horaSalida: '',
            horasTrabajadas: 0,
            tiendaId: null,
          };
          this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
        }
      });
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal();
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId };
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    // Ver comentario equivalente en turnos.component.ts: hay que resolver
    // turnosDelDiaActual antes de abrir el modal, no en paralelo.
    this.turnos$.pipe(take(1), takeUntil(this.destroy$)).subscribe((turnos) => {
      this.turnosDelDiaActual = (turnos || []).filter(
        (t) => t.colaboradorId === turno.colaboradorId && t.fecha === turno.fecha
      );
      this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
    });
  }

  cerrarModal(): void {
    this.modalService.cerrarModal(MODAL_CLOSE_DELAY_MS);
  }

  resetearEstadoModal(): void {
    this.turnoOriginal = null;
    this.turnoActual = crearTurnoVacio();
    this.turnosDelDiaActual = [];
  }

  manejarTurnoGuardado(): void {
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.cargarSemanaNormal(semanaActual);
  }

  manejarTurnoEliminado(): void {
    this.manejarTurnoGuardado();
  }
}
