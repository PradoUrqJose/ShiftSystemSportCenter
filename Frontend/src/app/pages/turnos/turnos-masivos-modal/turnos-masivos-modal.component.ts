import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { eachDayOfInterval, format } from 'date-fns';
import { Observable, Subject, catchError, debounceTime, forkJoin, of, switchMap, takeUntil, tap } from 'rxjs';
import Notiflix from 'notiflix';
import { Colaborador } from '../../../services/colaborador.service';
import { Tienda } from '../../../services/tienda.service';
import { TurnoPayload, TurnoService } from '../../../services/turno.service';
import { TurnoPredeterminado, TurnoPredeterminadoService } from '../../../services/turno-predeterminado.service';
import { TimePickerComponent } from '../../../components/time-picker/time-picker.component';
import { TiendaSelectComponent } from '../../../components/tienda-select/tienda-select.component';
import { DateRangePickerComponent } from '../../../components/date-range-picker/date-range-picker.component';
import { MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';

interface Conflicto {
  colaboradorId: number;
  colaboradorNombre: string;
  fecha: string; // yyyy-MM-dd
}

// Crea el mismo turno para varios colaboradores en un rango de fechas, de
// una sola pasada — la operación "uno por uno" que hoy obliga a abrir el
// modal de turno N veces. Reutiliza TurnoService.addTurno (mismo patrón
// forkJoin que TurnoService.addTurnoPartido y que
// TurnosCalendarService.copiarSemanaAnterior) y las plantillas rápidas de
// TurnoPredeterminadoService. Una sola tienda para todo el lote a propósito
// — si hace falta repartir en varias, se corre el modal más de una vez.
@Component({
  selector: 'app-turnos-masivos-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TimePickerComponent, TiendaSelectComponent, DateRangePickerComponent],
  templateUrl: './turnos-masivos-modal.component.html',
  styleUrls: ['./turnos-masivos-modal.component.css'],
})
export class TurnosMasivosModalComponent implements OnInit, OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() colaboradores: Colaborador[] = [];
  @Input() tiendas: Tienda[] = [];

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() turnosCreados = new EventEmitter<void>();

  readonly diasSemanaLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  readonly diasSemanaNombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  plantillas: TurnoPredeterminado[] = [];
  seleccionados = new Set<number>();
  busquedaColaborador: string = '';

  horaEntrada: string = '';
  horaSalida: string = '';
  tiendaId: number | null = null;
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  diasSeleccionados = new Set<number>([1, 2, 3, 4, 5]); // Lun-Vie por defecto

  previewCargando: boolean = false;
  previewListo: boolean = false;
  conflictos: Conflicto[] = [];
  totalACrear: number = 0;
  mostrarDetalleConflictos: boolean = false;
  isSubmitting: boolean = false;

  private readonly recalcular$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private turnoService: TurnoService,
    private turnoPredeterminadoService: TurnoPredeterminadoService
  ) {}

  ngOnInit(): void {
    this.turnoPredeterminadoService
      .getTurnosPredeterminados()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (data) => (this.plantillas = data), error: () => (this.plantillas = []) });

    this.recalcular$
      .pipe(
        debounceTime(400),
        switchMap(() => this.calcularPreview()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get colaboradoresFiltrados(): Colaborador[] {
    const q = this.busquedaColaborador.trim().toLowerCase();
    if (!q) return this.colaboradores;
    return this.colaboradores.filter((c) => `${c.nombre} ${c.apellido}`.toLowerCase().includes(q));
  }

  iniciales(colaborador: Colaborador): string {
    return `${colaborador.nombre?.[0] || ''}${colaborador.apellido?.[0] || ''}`.toUpperCase();
  }

  toggleColaborador(id: number): void {
    if (this.seleccionados.has(id)) this.seleccionados.delete(id);
    else this.seleccionados.add(id);
    this.recalcular$.next();
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados.has(id);
  }

  seleccionarTodos(): void {
    this.colaboradoresFiltrados.forEach((c) => this.seleccionados.add(c.id));
    this.recalcular$.next();
  }

  deseleccionarTodos(): void {
    this.seleccionados.clear();
    this.recalcular$.next();
  }

  trackByColaboradorId(_index: number, colaborador: Colaborador): number {
    return colaborador.id;
  }

  trackByPlantillaId(_index: number, plantilla: TurnoPredeterminado): number | undefined {
    return plantilla.id;
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [h, m] = hora.split(':');
    return `${h}:${m}`;
  }

  esPlantillaSeleccionada(plantilla: TurnoPredeterminado): boolean {
    return this.formatearHora(this.horaEntrada) === this.formatearHora(plantilla.horaEntrada) &&
      this.formatearHora(this.horaSalida) === this.formatearHora(plantilla.horaSalida);
  }

  seleccionarPlantilla(plantilla: TurnoPredeterminado): void {
    this.horaEntrada = plantilla.horaEntrada;
    this.horaSalida = plantilla.horaSalida;
    this.recalcular$.next();
  }

  onHoraEntradaChange(valor: string): void {
    this.horaEntrada = valor;
    this.recalcular$.next();
  }

  onHoraSalidaChange(valor: string): void {
    this.horaSalida = valor;
    this.recalcular$.next();
  }

  onTiendaChange(id: number): void {
    this.tiendaId = id;
    this.recalcular$.next();
  }

  onRangoChange(rango: { inicio: string; fin: string }): void {
    this.fechaInicio = rango.inicio;
    this.fechaFin = rango.fin;
    this.recalcular$.next();
  }

  toggleDia(dow: number): void {
    if (this.diasSeleccionados.has(dow)) this.diasSeleccionados.delete(dow);
    else this.diasSeleccionados.add(dow);
    this.recalcular$.next();
  }

  diaActivo(dow: number): boolean {
    return this.diasSeleccionados.has(dow);
  }

  aplicarPresetDias(preset: 'habiles' | 'todos'): void {
    this.diasSeleccionados.clear();
    const dias = preset === 'habiles' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
    dias.forEach((d) => this.diasSeleccionados.add(d));
    this.recalcular$.next();
  }

  toggleDetalleConflictos(): void {
    this.mostrarDetalleConflictos = !this.mostrarDetalleConflictos;
  }

  get formularioCompleto(): boolean {
    return this.seleccionados.size > 0 && !!this.horaEntrada && !!this.horaSalida && !!this.tiendaId && !!this.fechaInicio && !!this.fechaFin;
  }

  private diasCalificados(): Date[] {
    if (!this.fechaInicio || !this.fechaFin) return [];
    const inicio = new Date(`${this.fechaInicio}T00:00:00`);
    const fin = new Date(`${this.fechaFin}T00:00:00`);
    if (fin < inicio) return [];
    return eachDayOfInterval({ start: inicio, end: fin }).filter((d) => {
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      return this.diasSeleccionados.has(iso);
    });
  }

  private calcularPreview(): Observable<void> {
    const dias = this.diasCalificados();

    if (!this.formularioCompleto || dias.length === 0) {
      this.previewListo = false;
      this.previewCargando = false;
      this.conflictos = [];
      this.totalACrear = 0;
      return of(void 0);
    }

    this.previewCargando = true;
    return this.turnoService.getTurnosPorRangoFecha(this.fechaInicio!, this.fechaFin!).pipe(
      tap((existentes) => {
        const existentesSet = new Set(existentes.map((t) => `${t.colaboradorId}_${t.fecha}`));
        const conflictos: Conflicto[] = [];
        let total = 0;

        this.seleccionados.forEach((colId) => {
          const colaborador = this.colaboradores.find((c) => c.id === colId);
          dias.forEach((dia) => {
            const fechaIso = format(dia, 'yyyy-MM-dd');
            total++;
            if (existentesSet.has(`${colId}_${fechaIso}`)) {
              conflictos.push({
                colaboradorId: colId,
                colaboradorNombre: colaborador ? `${colaborador.nombre} ${colaborador.apellido}` : `Colaborador ${colId}`,
                fecha: fechaIso,
              });
            }
          });
        });

        this.conflictos = conflictos;
        this.totalACrear = total - conflictos.length;
        this.previewListo = true;
        this.previewCargando = false;
      }),
      switchMap(() => of(void 0)),
      catchError(() => {
        this.previewCargando = false;
        this.previewListo = false;
        return of(void 0);
      })
    );
  }

  diaSemanaNombre(fechaIso: string): string {
    const fecha = new Date(`${fechaIso}T00:00:00`);
    const iso = fecha.getDay() === 0 ? 7 : fecha.getDay();
    return this.diasSemanaNombres[iso - 1];
  }

  formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(`${fechaIso}T00:00:00`);
    return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
  }

  crearTurnos(): void {
    if (this.isSubmitting || this.totalACrear === 0) return;

    const detalleOmitidos = this.conflictos.length > 0
      ? `, ${this.conflictos.length} ${this.conflictos.length === 1 ? 'se omite porque ya tiene' : 'se omiten porque ya tienen'} turno cargado`
      : '';
    const verbo = this.totalACrear === 1 ? 'Se va a crear' : 'Se van a crear';
    const sustantivo = this.totalACrear === 1 ? 'turno' : 'turnos';
    Notiflix.Confirm.show(
      'Crear turnos masivos',
      `${verbo} ${this.totalACrear} ${sustantivo}${detalleOmitidos}. ¿Continuar?`,
      'Crear',
      'Cancelar',
      () => this.ejecutarCreacion(),
      () => {}
    );
  }

  private ejecutarCreacion(): void {
    this.isSubmitting = true;
    const dias = this.diasCalificados();
    const clavesOmitidas = new Set(this.conflictos.map((c) => `${c.colaboradorId}_${c.fecha}`));
    const payloads: TurnoPayload[] = [];

    this.seleccionados.forEach((colId) => {
      dias.forEach((dia) => {
        const fechaIso = format(dia, 'yyyy-MM-dd');
        if (clavesOmitidas.has(`${colId}_${fechaIso}`)) return;
        payloads.push({
          colaboradorId: colId,
          fecha: fechaIso,
          horaEntrada: this.horaEntrada,
          horaSalida: this.horaSalida,
          tiendaId: this.tiendaId!,
        });
      });
    });

    if (payloads.length === 0) {
      this.isSubmitting = false;
      Notiflix.Notify.info('No hay turnos nuevos para crear', { position: 'right-bottom', cssAnimationStyle: 'from-right' });
      return;
    }

    forkJoin(payloads.map((p) => this.turnoService.addTurno(p))).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        const detalleOmitidos = this.conflictos.length > 0 ? `, ${this.conflictos.length} omitido(s)` : '';
        Notiflix.Notify.success(`${payloads.length} turno(s) creado(s)${detalleOmitidos}`, {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
        this.turnosCreados.emit();
        this.cerrarModal();
      },
      error: (err) => {
        this.isSubmitting = false;
        Notiflix.Notify.failure(err.message || 'Error al crear los turnos', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
      },
    });
  }

  cerrarModal(): void {
    this.isModalVisible = false;
    setTimeout(() => {
      this.cerrarModalEvent.emit();
      this.resetearEstado();
    }, MODAL_CLOSE_DELAY_MS);
  }

  private resetearEstado(): void {
    this.seleccionados.clear();
    this.busquedaColaborador = '';
    this.horaEntrada = '';
    this.horaSalida = '';
    this.tiendaId = null;
    this.fechaInicio = null;
    this.fechaFin = null;
    this.diasSeleccionados = new Set([1, 2, 3, 4, 5]);
    this.previewListo = false;
    this.conflictos = [];
    this.totalACrear = 0;
    this.mostrarDetalleConflictos = false;
  }
}
