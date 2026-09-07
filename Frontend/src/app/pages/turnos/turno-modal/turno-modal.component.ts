import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService, Turno, TurnoPayload, TurnoPartidoPayload, crearTurnoVacio } from '../../../services/turno.service';
import { TiendaService, Tienda } from '../../../services/tienda.service';
import { TurnoPredeterminado, TurnoPredeterminadoService } from '../../../services/turno-predeterminado.service';
import { Observable, Subject, map, takeUntil } from 'rxjs';
import Notiflix from 'notiflix';
import { AgregarTiendaModalComponent } from '../agregar-tienda-modal/agregar-tienda-modal.component';
import { GestionarTiendasModalComponent } from '../gestionar-tiendas-modal/gestionar-tiendas-modal.component';
import { GestionarTurnosPredeterminadosModalComponent } from '../gestionar-turnos-predeterminados-modal/gestionar-turnos-predeterminados-modal.component';
import { TimePickerComponent } from '../../../components/time-picker/time-picker.component';
import { TiendaSelectComponent } from '../../../components/tienda-select/tienda-select.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../../utils/modal-timing';
import { ButtonComponent } from '../../../components/ui/button/button.component';

// Un bloque = un turno (fila independiente en el backend) dentro de un
// turno partido. `id` presente significa que ya existe como Turno guardado
// (se actualiza al guardar); sin `id` es un bloque nuevo (se crea).
interface BloqueForm {
  id?: number;
  horaEntrada: string;
  horaSalida: string;
  tomoAlmuerzo: boolean;
  errorHoraEntrada: string | null;
  errorHoraSalida: string | null;
}

@Component({
    selector: 'app-turno-modal',
    imports: [
        CommonModule,
        FormsModule,
        AgregarTiendaModalComponent,
        GestionarTiendasModalComponent,
        GestionarTurnosPredeterminadosModalComponent,
        TimePickerComponent,
        TiendaSelectComponent,
        ButtonComponent,
    ],
    templateUrl: './turno-modal.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./turno-modal.component.css']
})
export class TurnoModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() mostrarModal: boolean = false;
  @Input() isModalVisible: boolean = false;
  @Input() turnoActual: Turno = crearTurnoVacio();
  @Input() turnoOriginal: Turno | null = null;
  // Todos los turnos (filas) del mismo colaborador+fecha que turnoActual —
  // si hay más de uno, el modal abre en modo "turno partido" con un bloque
  // por fila existente. El padre lo arma filtrando su lista de turnos (ver
  // turnos.component.ts / semana-normal.component.ts).
  @Input() turnosDelDiaActual: Turno[] = [];
  @Input() tiendas$: Observable<Tienda[]> = new Observable<Tienda[]>();
  @Input() tiendasInput$: Observable<Tienda[]> = new Observable<Tienda[]>();

  @Output() cerrarModalEvent = new EventEmitter<void>();
  @Output() turnoGuardado = new EventEmitter<void>();
  @Output() turnoEliminado = new EventEmitter<void>();

  isSubmitting: boolean = false;
  errorHoraEntrada: string | null = null;
  errorHoraSalida: string | null = null;
  errorTienda: string | null = null;

  // Turnos partidos: N bloques horarios, 2 por defecto, hasta MAX_BLOQUES.
  readonly MIN_BLOQUES = 2;
  readonly MAX_BLOQUES = 4;
  esTurnoPartido: boolean = false;
  bloques: BloqueForm[] = [];
  // Turnos ya existentes ese día al abrir el modal (para diffear altas/
  // actualizaciones/eliminaciones al guardar). Vacío si se está creando.
  private bloquesOriginales: Turno[] = [];

  // El tipo de turno (simple/partido) queda fijo una vez que se edita un
  // turno existente — cuántas filas había ese día ya lo decidió el padre.
  // Lo que sí se puede editar libremente dentro de un turno partido es la
  // cantidad y el horario de sus bloques (agregar/quitar/modificar).
  get tipoTurnoDisabled(): boolean {
    return this.estaEditandoTurnoExistente;
  }

  // true si el formulario abrió sobre un turno (simple o partido) que ya
  // existe como fila(s) en el backend — decide si el tipo de turno queda
  // fijo, el label del botón, y si se muestra "Eliminar".
  get estaEditandoTurnoExistente(): boolean {
    return !!this.turnoActual.id || this.bloquesOriginales.length > 0;
  }

  mostrarModalAgregarTienda: boolean = false;
  isModalAgregarTiendaVisible: boolean = false;
  mostrarModalGestionarTiendas: boolean = false;
  isModalGestionarTiendasVisible: boolean = false;
  tiendaActual: Tienda = { id: undefined, nombre: '', direccion: '' };

  // Plantillas rápidas (ver TurnoPredeterminadoService) — sin relación con
  // tienda ni con el turno creado, son solo un atajo de UI.
  plantillas: TurnoPredeterminado[] = [];
  mostrarModalGestionarPlantillas: boolean = false;
  isModalGestionarPlantillasVisible: boolean = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private turnoService: TurnoService,
    private tiendaService: TiendaService,
    private turnoPredeterminadoService: TurnoPredeterminadoService
  ) {
    // Aplicar el ordenamiento a tiendas$ internamente
    this.tiendas$ = this.tiendasInput$.pipe(
      map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b)))
    );
  }

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  // El modal es un singleton reutilizado (el padre solo cambia sus @Input y
  // alterna mostrarModal) — acá es donde se re-siembra el formulario cada
  // vez que se abre para editar un turno existente.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrarModal'] && this.mostrarModal) {
      this.inicializarFormulario();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cerrarModal(): void {
    this.isSubmitting = true;
    this.cerrarModalEvent.emit();
    setTimeout(() => {
      this.isSubmitting = false;
      this.errorHoraEntrada = null;
      this.errorHoraSalida = null;
      this.resetTurnoPartido();
    }, MODAL_CLOSE_DELAY_MS);
  }

  private inicializarFormulario(): void {
    if (this.turnosDelDiaActual && this.turnosDelDiaActual.length > 1) {
      this.esTurnoPartido = true;
      this.bloquesOriginales = [...this.turnosDelDiaActual].sort((a, b) =>
        this.formatearHora(a.horaEntrada).localeCompare(this.formatearHora(b.horaEntrada))
      );
      this.bloques = this.bloquesOriginales.map((turno) => this.crearBloqueDesdeTurno(turno));
    } else {
      this.esTurnoPartido = false;
      this.bloquesOriginales = [];
      this.bloques = this.crearBloquesVacios();
    }
  }

  resetTurnoPartido(): void {
    this.esTurnoPartido = false;
    this.bloques = this.crearBloquesVacios();
    this.bloquesOriginales = [];
  }

  guardarTurno(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Limpiar errores
    this.errorHoraEntrada = null;
    this.errorHoraSalida = null;
    this.errorTienda = null;

    if (!this.turnoActual.tiendaId) {
      this.isSubmitting = false;
      this.errorTienda = 'La selección de tienda es obligatoria';
      Notiflix.Notify.failure('Debes seleccionar una tienda', {
        position: 'right-bottom',
        cssAnimationStyle: 'from-right',
      });
      return;
    }

    if (this.esTurnoPartido) {
      this.guardarTurnoPartido();
    } else {
      this.guardarTurnoSimple();
    }
  }

  private guardarTurnoSimple(): void {
    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (this.errorHoraEntrada || this.errorHoraSalida) {
      this.isSubmitting = false;
      return;
    }

    const horaEntrada = this.formatearHora(this.turnoActual.horaEntrada);
    const horaSalida = this.formatearHora(this.turnoActual.horaSalida);
    if (horaEntrada >= horaSalida) {
      this.errorHoraSalida = 'La hora de salida debe ser posterior a la hora de entrada.';
      this.isSubmitting = false;
      return;
    }

    const turnoParaGuardar: TurnoPayload = {
      colaboradorId: this.turnoActual.colaboradorId!,
      fecha: this.turnoActual.fecha,
      horaEntrada: this.turnoActual.horaEntrada,
      horaSalida: this.turnoActual.horaSalida,
      tiendaId: Number(this.turnoActual.tiendaId),
      tomoAlmuerzo: !!this.turnoActual.tomoAlmuerzo,
    };

    const operacion = this.turnoActual.id
      ? this.turnoService.updateTurno(this.turnoActual.id, turnoParaGuardar)
      : this.turnoService.addTurno(turnoParaGuardar);

    operacion.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.turnoGuardado.emit();
        this.cerrarModal();
        Notiflix.Notify.success(
          this.turnoActual.id ? 'Turno actualizado con éxito' : 'Turno creado con éxito',
          { position: 'right-bottom', cssAnimationStyle: 'from-right' }
        );
      },
      error: (err) => {
        this.isSubmitting = false;
        Notiflix.Notify.failure(err.message || 'Error al guardar el turno', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
      }
    });
  }

  private guardarTurnoPartido(): void {
    this.validarBloques();

    if (this.hayErroresEnBloques()) {
      this.isSubmitting = false;
      return;
    }

    const colaboradorId = this.turnoActual.colaboradorId!;
    const fecha = this.turnoActual.fecha;
    const tiendaId = Number(this.turnoActual.tiendaId);

    const idsActuales = new Set(this.bloques.filter((b) => b.id != null).map((b) => b.id));
    const eliminaciones = this.bloquesOriginales
      .filter((turno) => !idsActuales.has(turno.id))
      .map((turno) => turno.id);

    const altas: TurnoPayload[] = this.bloques
      .filter((b) => b.id == null)
      .map((b) => ({
        colaboradorId,
        fecha,
        tiendaId,
        horaEntrada: b.horaEntrada,
        horaSalida: b.horaSalida,
        tomoAlmuerzo: b.tomoAlmuerzo,
      }));

    const actualizaciones = this.bloques
      .filter((b): b is BloqueForm & { id: number } => b.id != null)
      .map((b) => ({
        id: b.id,
        payload: {
          colaboradorId,
          fecha,
          tiendaId,
          horaEntrada: b.horaEntrada,
          horaSalida: b.horaSalida,
          tomoAlmuerzo: b.tomoAlmuerzo,
        } as TurnoPayload,
      }));

    const esEdicion = this.bloquesOriginales.length > 0;

    this.turnoService.guardarBloques({ altas, actualizaciones, eliminaciones }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.turnoGuardado.emit();
        this.cerrarModal();
        Notiflix.Notify.success(
          esEdicion ? 'Turno partido actualizado con éxito' : 'Turno partido creado con éxito',
          { position: 'right-bottom', cssAnimationStyle: 'from-right' }
        );
      },
      error: (err) => {
        this.isSubmitting = false;
        Notiflix.Notify.failure(err.message || 'Error al guardar el turno partido', {
          position: 'right-bottom',
          cssAnimationStyle: 'from-right',
        });
      }
    });
  }

  eliminarTurno(): void {
    if (!this.turnoActual.id && this.bloquesOriginales.length === 0) return;

    const idsAEliminar = this.esTurnoPartido
      ? this.bloquesOriginales.map((t) => t.id)
      : [this.turnoActual.id!];

    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      this.esTurnoPartido
        ? '¿Estás seguro de que deseas eliminar este turno partido (todos sus bloques)?'
        : '¿Estás seguro de que deseas eliminar este turno?',
      'Eliminar',
      'Cancelar',
      () => {
        this.turnoService
          .guardarBloques({ altas: [], actualizaciones: [], eliminaciones: idsAEliminar })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.turnoEliminado.emit();
              this.cerrarModal();
              Notiflix.Notify.success('Turno eliminado con éxito', {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              });
            },
            error: () => {
              Notiflix.Notify.failure('Error al eliminar el turno', {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              });
            }
          });
      },
      () => {}
    );
  }

  // Antes cada validarHorarioX repetía el mismo cuerpo (obligatoriedad +
  // rango horas/minutos), solo cambiando los límites y el mensaje — este
  // helper compacta las 5 que comparten exactamente la misma forma
  // (`horas < min || horas > max || (horas === max && minutos > 0)`).
  // validarHorarioSalida (turno simple) queda aparte porque su regla es
  // distinta (permite cruzar medianoche) y no encaja en este patrón.
  private validarRangoHora(
    hora: string | undefined,
    minHora: number,
    maxHora: number,
    mensajeObligatoria: string,
    mensajeRango: string
  ): string | null {
    if (!hora) return mensajeObligatoria;

    const horaFormateada = this.formatearHora(hora);
    const [horas, minutos] = horaFormateada.split(':').map(Number);

    if (horas < minHora || horas > maxHora || (horas === maxHora && minutos > 0)) {
      return mensajeRango;
    }
    return null;
  }

  // Handlers de los TimePicker/TiendaSelect: el (valueChange) de esos
  // componentes reemplaza al [(ngModel)] + (change) que tenían los inputs
  // nativos — misma validación de siempre, solo cambia quién dispara el evento.
  onHoraEntradaChange(valor: string): void {
    this.turnoActual.horaEntrada = valor;
    this.validarHorarioEntrada();
    this.turnoActual.tomoAlmuerzo = this.calcularAlmuerzoAutomatico(this.turnoActual.horaEntrada, this.turnoActual.horaSalida);
  }

  onHoraSalidaChange(valor: string): void {
    this.turnoActual.horaSalida = valor;
    this.validarHorarioSalida();
    this.turnoActual.tomoAlmuerzo = this.calcularAlmuerzoAutomatico(this.turnoActual.horaEntrada, this.turnoActual.horaSalida);
  }

  onTomoAlmuerzoChange(checked: boolean): void {
    this.turnoActual.tomoAlmuerzo = checked;
  }

  onTiendaChange(id: number): void {
    this.turnoActual.tiendaId = id;
    this.errorTienda = null;
  }

  validarHorarioEntrada(): void {
    this.errorHoraEntrada = this.validarRangoHora(
      this.turnoActual.horaEntrada, 5, 22,
      'La hora de entrada es obligatoria.',
      'La hora de entrada debe ser entre las 5:00 AM y las 10:00 PM.'
    );
  }

  validarHorarioSalida(): void {
    let hora = this.turnoActual.horaSalida;
    if (!hora) {
      this.errorHoraSalida = 'La hora de salida es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora);
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 10 || (horas === 0 && minutos > 0) || horas > 24) {
      this.errorHoraSalida = 'La hora de salida debe ser entre las 10:00 AM y las 12:00 AM.';
    } else {
      this.errorHoraSalida = null;
    }
  }

  // ---- Turno partido: bloques dinámicos ----

  private bloqueVacio(): BloqueForm {
    return {
      horaEntrada: '',
      horaSalida: '',
      tomoAlmuerzo: false,
      errorHoraEntrada: null,
      errorHoraSalida: null,
    };
  }

  private crearBloquesVacios(): BloqueForm[] {
    return [this.bloqueVacio(), this.bloqueVacio()];
  }

  private crearBloqueDesdeTurno(turno: Turno): BloqueForm {
    return {
      id: turno.id,
      horaEntrada: turno.horaEntrada,
      horaSalida: turno.horaSalida,
      tomoAlmuerzo: !!turno.tomoAlmuerzo,
      errorHoraEntrada: null,
      errorHoraSalida: null,
    };
  }

  puedeAgregarBloque(): boolean {
    return this.bloques.length < this.MAX_BLOQUES;
  }

  puedeQuitarBloque(): boolean {
    return this.bloques.length > this.MIN_BLOQUES;
  }

  agregarBloque(): void {
    if (this.puedeAgregarBloque()) {
      this.bloques.push(this.bloqueVacio());
    }
  }

  quitarBloque(index: number): void {
    if (this.puedeQuitarBloque()) {
      this.bloques.splice(index, 1);
      this.validarBloques();
    }
  }

  onHoraEntradaBloqueChange(index: number, valor: string): void {
    const bloque = this.bloques[index];
    bloque.horaEntrada = valor;
    bloque.tomoAlmuerzo = this.calcularAlmuerzoAutomatico(bloque.horaEntrada, bloque.horaSalida);
    this.validarBloques();
  }

  onHoraSalidaBloqueChange(index: number, valor: string): void {
    const bloque = this.bloques[index];
    bloque.horaSalida = valor;
    bloque.tomoAlmuerzo = this.calcularAlmuerzoAutomatico(bloque.horaEntrada, bloque.horaSalida);
    this.validarBloques();
  }

  onTomoAlmuerzoBloqueChange(index: number, checked: boolean): void {
    this.bloques[index].tomoAlmuerzo = checked;
  }

  // Regla automática de almuerzo (entrada antes de 12:01 y salida después de
  // 14:00) — solo fija el valor por defecto del checkbox; el administrador
  // lo puede togglear a mano después (ver Turno.calcularAlmuerzoPorDefecto
  // en el backend, misma regla).
  private calcularAlmuerzoAutomatico(horaEntrada: string | undefined, horaSalida: string | undefined): boolean {
    if (!horaEntrada || !horaSalida) return false;
    const entrada = this.formatearHora(horaEntrada);
    const salida = this.formatearHora(horaSalida);
    return entrada < '12:01' && salida > '14:00';
  }

  // Valida obligatoriedad + orden (entrada < salida) de cada bloque, y que
  // ningún par de bloques se solape entre sí (no hay más "mañana"/"tarde"
  // fijos: cualquier bloque puede cruzarse con cualquier otro).
  validarBloques(): void {
    this.bloques.forEach((bloque, index) => {
      if (!bloque.horaEntrada) {
        bloque.errorHoraEntrada = `La hora de entrada del bloque ${index + 1} es obligatoria.`;
      } else {
        bloque.errorHoraEntrada = null;
      }

      if (!bloque.horaSalida) {
        bloque.errorHoraSalida = `La hora de salida del bloque ${index + 1} es obligatoria.`;
      } else if (bloque.horaEntrada && this.formatearHora(bloque.horaEntrada) >= this.formatearHora(bloque.horaSalida)) {
        bloque.errorHoraSalida = `La salida del bloque ${index + 1} debe ser posterior a su entrada.`;
      } else {
        bloque.errorHoraSalida = null;
      }
    });

    this.validarSolapamientoBloques();
  }

  private validarSolapamientoBloques(): void {
    for (let i = 0; i < this.bloques.length; i++) {
      const a = this.bloques[i];
      if (a.errorHoraEntrada || a.errorHoraSalida || !a.horaEntrada || !a.horaSalida) continue;

      for (let j = i + 1; j < this.bloques.length; j++) {
        const b = this.bloques[j];
        if (b.errorHoraEntrada || b.errorHoraSalida || !b.horaEntrada || !b.horaSalida) continue;

        const aEntrada = this.formatearHora(a.horaEntrada);
        const aSalida = this.formatearHora(a.horaSalida);
        const bEntrada = this.formatearHora(b.horaEntrada);
        const bSalida = this.formatearHora(b.horaSalida);

        const seSolapan = aEntrada < bSalida && bEntrada < aSalida;
        if (seSolapan) {
          a.errorHoraSalida = `El bloque ${i + 1} se solapa con el bloque ${j + 1}.`;
          b.errorHoraEntrada = `El bloque ${j + 1} se solapa con el bloque ${i + 1}.`;
        }
      }
    }
  }

  hayErroresEnBloques(): boolean {
    return this.bloques.some((b) => !!b.errorHoraEntrada || !!b.errorHoraSalida);
  }

  trackByBloqueIndex(index: number): number {
    return index;
  }

  seRealizaronCambios(): boolean {
    if (this.esTurnoPartido) {
      if (this.bloquesOriginales.length === 0) return true; // creación
      return this.snapshotBloques(this.bloques) !== this.snapshotBloquesOriginales()
        || this.turnoActual.tiendaId !== this.bloquesOriginales[0]?.tiendaId;
    }

    if (!this.turnoOriginal) return true;
    return (
      this.turnoActual.horaEntrada !== this.turnoOriginal.horaEntrada ||
      this.turnoActual.horaSalida !== this.turnoOriginal.horaSalida ||
      this.turnoActual.fecha !== this.turnoOriginal.fecha ||
      this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId ||
      !!this.turnoActual.tomoAlmuerzo !== !!this.turnoOriginal.tomoAlmuerzo
    );
  }

  private snapshotBloques(bloques: { id?: number; horaEntrada: string; horaSalida: string; tomoAlmuerzo: boolean }[]): string {
    return bloques
      .map((b) => `${b.id ?? 'nuevo'}|${b.horaEntrada}|${b.horaSalida}|${b.tomoAlmuerzo}`)
      .sort()
      .join(';');
  }

  private snapshotBloquesOriginales(): string {
    return this.snapshotBloques(
      this.bloquesOriginales.map((t) => ({
        id: t.id,
        horaEntrada: t.horaEntrada,
        horaSalida: t.horaSalida,
        tomoAlmuerzo: !!t.tomoAlmuerzo,
      }))
    );
  }

  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }

  // Agregar Tienda
  abrirModalAgregarTienda(): void {
    this.mostrarModalAgregarTienda = true;
    setTimeout(() => this.isModalAgregarTiendaVisible = true, MODAL_OPEN_DELAY_MS);
  }

  cerrarModalAgregarTienda(): void {
    this.isModalAgregarTiendaVisible = false;
    // Antes desmontaba a los 50ms, cortando de golpe la transición CSS de
    // salida (dura 300ms, ver agregar-tienda-modal.component.html).
    setTimeout(() => this.mostrarModalAgregarTienda = false, MODAL_CLOSE_DELAY_MS);
  }

  abrirModalGestionarTiendas(): void {
    this.mostrarModalGestionarTiendas = true;
    setTimeout(() => this.isModalGestionarTiendasVisible = true, MODAL_OPEN_DELAY_MS);
  }

  cerrarModalGestionarTiendas(): void {
    this.isModalGestionarTiendasVisible = false;
    setTimeout(() => this.mostrarModalGestionarTiendas = false, MODAL_CLOSE_DELAY_MS);
  }

  manejarTiendaGuardada(): void {
    this.tiendas$ = this.tiendaService.getTiendas().pipe(
      map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b)))
    );
  }

  manejarTiendaEliminada(): void {
    this.manejarTiendaGuardada();
  }

  manejarEditarTienda(tienda: Tienda): void {
    this.tiendaActual = { ...tienda };
    this.abrirModalAgregarTienda();
  }

  trackByTiendaId(_index: number, tienda: Tienda): number | undefined {
    return tienda.id;
  }

  // Plantillas rápidas
  cargarPlantillas(): void {
    this.turnoPredeterminadoService.getTurnosPredeterminados().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => (this.plantillas = data),
      error: () => (this.plantillas = []),
    });
  }

  seleccionarPlantilla(plantilla: TurnoPredeterminado): void {
    this.turnoActual.horaEntrada = plantilla.horaEntrada;
    this.turnoActual.horaSalida = plantilla.horaSalida;
    this.validarHorarioEntrada();
    this.validarHorarioSalida();
    this.turnoActual.tomoAlmuerzo = this.calcularAlmuerzoAutomatico(this.turnoActual.horaEntrada, this.turnoActual.horaSalida);
  }

  // El chip se ve "seleccionado" si sus horarios coinciden con lo cargado
  // en el form — no hace falta trackear un estado de selección aparte: si
  // el operador edita el input a mano, deja de matchear solo.
  esPlantillaSeleccionada(plantilla: TurnoPredeterminado): boolean {
    return (
      this.formatearHora(this.turnoActual.horaEntrada) === this.formatearHora(plantilla.horaEntrada) &&
      this.formatearHora(this.turnoActual.horaSalida) === this.formatearHora(plantilla.horaSalida)
    );
  }

  trackByPlantillaId(_index: number, plantilla: TurnoPredeterminado): number | undefined {
    return plantilla.id;
  }

  abrirModalGestionarPlantillas(): void {
    this.mostrarModalGestionarPlantillas = true;
    setTimeout(() => (this.isModalGestionarPlantillasVisible = true), MODAL_OPEN_DELAY_MS);
  }

  cerrarModalGestionarPlantillas(): void {
    this.isModalGestionarPlantillasVisible = false;
    setTimeout(() => (this.mostrarModalGestionarPlantillas = false), MODAL_CLOSE_DELAY_MS);
  }

  manejarPlantillaGuardada(): void {
    this.cargarPlantillas();
  }

  manejarPlantillaEliminada(): void {
    this.cargarPlantillas();
  }

  private customSort(a: Tienda, b: Tienda): number {
    const numA = this.extractNumber(a.nombre);
    const numB = this.extractNumber(b.nombre);
    if (numA !== null && numB !== null) return numA - numB;
    else if (numA !== null) return -1;
    else if (numB !== null) return 1;
    else return a.nombre.localeCompare(b.nombre);
  }

  private extractNumber(nombre: string): number | null {
    const match = nombre.match(/Tienda (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }


}
