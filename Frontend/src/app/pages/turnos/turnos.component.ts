import { DiaSemana } from './../../services/calendario.service';
// -------------- Core Angular Imports --------------
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Output,
  EventEmitter,
} from '@angular/core';

// -------------- Service Imports --------------
import {
  TurnoService,
  Turno,
  crearTurnoVacio,
} from './../../services/turno.service';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { TiendaService, Tienda } from '../../services/tienda.service';
import { Feriado } from '../../services/feriado.service';

// -------------- Date-fns and Date-fns-TZ Imports --------------
import {
  startOfMonth,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale'; // Importación de la localización para español

// -------------- RxJS Imports --------------
import { BehaviorSubject, combineLatest, map, Observable, of, Subject, Subscription, takeUntil } from 'rxjs';

// -------------- Angular Modules Imports --------------
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// -------------- External Libraries Imports --------------
import { TurnoStateService } from '../../services/turno-state.service';
import { ModalService } from '../../services/modal.service';
import { CalendarioService } from '../../services/calendario.service';
import { SemanaService } from '../../services/semana.service';
import { HeaderComponent } from './header/header.component';
import { WeeklyViewComponent } from './weekly-view/weekly-view.component';
import { MonthlyViewComponent } from './monthly-view/monthly-view.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../utils/modal-timing';

import { TurnoModalComponent } from './turno-modal/turno-modal.component'; // Nuevo componente

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, WeeklyViewComponent, MonthlyViewComponent, TurnoModalComponent, FilterBarComponent],
})
export default class TurnosComponent implements OnInit, OnDestroy {
  //! Variables de estado
  feriados: Feriado[] = []; // Lista de feriados
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = ''; // Nombre del mes actual
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  colaboradoresFiltrados$: Observable<Colaborador[]> = of([]);
  turnos$: Observable<Turno[]> = of([]); // Observable de turnos
  tiendas$: Observable<Tienda[]> = of([]); // Observable de tiendas
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>([]);
  isSubmitting: boolean = false; // Bandera para deshabilitar el botón de envío

  //? Manejo de MODAL
  mostrarModal$!: Observable<boolean>; // ✅ Declaramos correctamente
  isModalVisible$!: Observable<boolean>; // ✅ Declaramos correctamente

  // Variables para el modal de Agregar Tienda
  mostrarModalAgregarTienda: boolean = false;
  isModalAgregarTiendaVisible: boolean = false;

  // Variables para el modal de Gestionar Tiendas
  mostrarModalGestionarTiendas: boolean = false;
  isModalGestionarTiendasVisible: boolean = false;

  //* Estado del modal
  // (la validación de horario y sus mensajes de error viven en
  // turno-modal.component.ts, que tiene su propia copia funcional — esto acá
  // nunca se leía en el template)
  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno
  turnoActual: Turno = crearTurnoVacio(); // Turno actual

  //! Variables de vista
  vistaMensual!: boolean; // ✅ Variable para guardar el estado booleano de `vistaMensual$`
  diasMes: DiaSemana[] = []; // Días del mes
  turnosMensuales$: Observable<Turno[]> = of([]); // Turnos mensuales
  colaboradorSeleccionado: number = 0; // Colaborador seleccionado (mensual)
  colaboradoresSeleccionadosSemana: number[] = []; // Filtro multi-select semanal
  semanasDelMes: DiaSemana[][] = []; // Semanas del mes
  diasSemana = [
    { nombre: 'Lun' },
    { nombre: 'Mar' },
    { nombre: 'Mié' },
    { nombre: 'Jue' },
    { nombre: 'Vie' },
    { nombre: 'Sáb' },
    { nombre: 'Dom' },
  ]; // Días de la semana

  // Nuevas propiedades para mes y año
  mes: number = 0;
  anio: number = 0;
  selectedCompanyForMonthly: string = 'all';
  private selectedCompanyForMonthly$ = new BehaviorSubject<string>('all');
  private selectedCollaboratorsFilter$ = new BehaviorSubject<number[]>([]);
  @Output() turnosModificados = new EventEmitter<void>(); // Nuevo evento para notificar cambios

  private turnosSubscription?: Subscription;
  private turnosMensualesSubscription?: Subscription;
  private readonly destroy$ = new Subject<void>(); // Emite al destruir el componente, corta todas las suscripciones abiertas

  constructor(
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService, // ✅ Inyectamos el nuevo servicio
    private modalService: ModalService, // ✅ Inyectamos el nuevo servicio
    private colaboradorService: ColaboradorService,
    private tiendaService: TiendaService,
    private semanaService: SemanaService, // Inyectar el nuevo servicio
    private calendarioService: CalendarioService, // ✅ Nuevo servicio inyectado
    private cdr: ChangeDetectorRef

  ) {
    this.colaboradores$ =
      this.colaboradorService.getColaboradoresPorHabilitacion(true); // Obtener colaboradores
    this.nombreMesActual = format(this.turnoStateService.getSemanaActual(), 'MMMM yyyy', {
      locale: es,
    });
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
    // Inicializar mes y año desde semanaActual
    this.actualizarMesAnio();
    this.colaboradoresFiltrados$ = combineLatest([
      this.colaboradores$,
      this.selectedCompanyForMonthly$,
      this.selectedCollaboratorsFilter$,
    ]).pipe(
      map(([cols, company, ids]) => {
        const list = cols || [];
        const byCompany = (company === 'all') ? list : list.filter(c => (c.empresaNombre || 'Sin Empresa') === company);
        if (ids && ids.length > 0) {
          const set = new Set(ids);
          return byCompany.filter(c => set.has(c.id));
        }
        return byCompany;
      })
    );
  }

  //! Métodos del ciclo de vida
  ngOnInit(): void {
    // ✅ Asignamos las variables después de la inicialización
    this.isLoading$ = this.turnoStateService.isLoading$;
    this.turnoStateService.vistaMensual$.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.vistaMensual = value;
    });
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
    this.vistaMensual = false;
    this.cargarSemana();
    this.cargarTiendas();
    this.actualizarNombreMes();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para actualizar mes y año desde semanaActual
  private actualizarMesAnio(): void {
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.mes = semanaActual.getMonth() + 1; // getMonth() devuelve 0-11, sumamos 1 para 1-12
    this.anio = semanaActual.getFullYear();
  }

  empresasFromList(colaboradores: Colaborador[] | null | undefined): string[] {
    const list = colaboradores || [];
    const unique = Array.from(new Set(list.map(c => c.empresaNombre || 'Sin Empresa')));
    return ['all', ...unique.sort()];
  }

  onMonthlyCompanyChange(company: string): void {
    this.selectedCompanyForMonthly = company;
    this.selectedCompanyForMonthly$.next(company);
  }

  onMonthlyCollaboratorChange(ids: number[] | number | null): void {
    // Aplicar al semanal como multi-select
    this.colaboradoresSeleccionadosSemana = Array.isArray(ids) ? ids : (ids ? [ids] : []);
    // Aplicar al mensual: si un único colaborador, mostrar; si varios/ninguno, mostrar 0 y pedir selección
    if (Array.isArray(ids)) {
      this.colaboradorSeleccionado = ids.length === 1 ? ids[0] : 0;
      if (this.vistaMensual && this.colaboradorSeleccionado) {
        this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      }
      this.selectedCollaboratorsFilter$.next(this.colaboradoresSeleccionadosSemana);
    } else {
      const id = ids || 0;
      this.colaboradorSeleccionado = id;
      if (this.vistaMensual && id) this.mostrarTurnosMensuales(id);
      this.selectedCollaboratorsFilter$.next(this.colaboradoresSeleccionadosSemana);
    }
  }

  cargarMes(): void {
    this.turnoStateService.setLoading(true);
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.calendarioService.obtenerSemanasDelMesConCompletado(semanaActual).pipe(takeUntil(this.destroy$)).subscribe({
      next: (semanas) => {
        this.semanasDelMes = semanas;
        this.diasMes = this.semanasDelMes.flat();
        this.turnoStateService.setLoading(false);
        this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      },
      error: () => {
        this.semanasDelMes = [];
        this.diasMes = [];
        this.turnoStateService.setLoading(false);
      }
    });
  }

  //? Mostrar Turnos mensuales
  mostrarTurnosMensuales(colaboradorId: number): void {
    if (colaboradorId) {
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
  }

  //? Cambio de vista
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
        const semanaSeleccionada = semanas.find(semana =>
          semana.some(dia => dia.fecha === format(semanaActual, 'yyyy-MM-dd'))
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
      }
    });

    this.actualizarNombreMes();
  }

  // Turnos de una semana ya resuelta (7 días con fecha real, Lunes a
  // Domingo) — reemplaza a pedirle al backend "la semana número N del mes"
  // (ver turno.service.ts). Reutilizado por cargarSemana, cambiarSemana y
  // manejarTurnoGuardado, que antes recalculaban esto cada uno a su manera.
  private cargarTurnosDeSemana(semana: DiaSemana[]): Observable<Turno[]> {
    const inicio = semana[0].fecha;
    const fin = semana[semana.length - 1].fecha;
    return this.turnoService.getTurnosPorRangoFecha(inicio, fin);
  }

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService.getTiendas(); // Sin ordenamiento aquí
  }

  //! Métodos de utilidad
  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }

  esDiaActual(fecha: string): boolean {
    return this.calendarioService.esDiaActual(fecha);
  }

  actualizarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
    }
  }

  //! Métodos de navegación
  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    const nuevaFecha = this.calendarioService.cambiarMes(
      this.turnoStateService.getSemanaActual(),
      direccion
    );

    this.turnoStateService.setSemanaActual(nuevaFecha); // ✅ Actualizar estado global
    this.cargarMes();
    this.actualizarNombreMes();
    this.actualizarMesAnio(); // Actualizar mes y año
    this.cdr.detectChanges(); // Forzar detección de cambios
  }


  //? Cambiar Semana Lógica Completa <-----------------------------------


  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.turnoStateService.setLoading(true);
    this.semanaService.cambiarSemana(direccion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (nuevaSemana) => {
        this.diasSemana$.next(nuevaSemana);
        this.turnos$ = this.cargarTurnosDeSemana(nuevaSemana);
        this.actualizarNombreMes();
        this.actualizarMesAnio();
        this.turnoStateService.setLoading(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.turnoStateService.setLoading(false);
      },
    });
  }

  // Método para manejar el cambio de semana o mes
  cambiarSemanaOMesHandler(direccion: 'anterior' | 'siguiente'): void {
    if (this.vistaMensual) {
      // Si la vista es mensual, cambia el mes
      this.cambiarMes(direccion);
    } else {
      // Si la vista es semanal, cambia la semana
      this.cambiarSemana(direccion);
    }
  }

  //? ---------------------------------------------------->

  //! Métodos de modal
  abrirModal(colaboradorId: number, fecha: string): void {
    this.resetearEstadoModal();
    this.colaboradores$
      .pipe(
        map((colaboradores) =>
          colaboradores.find((c) => c.id === colaboradorId)
        ),
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
            fecha: fecha,
            horaEntrada: '',
            horaSalida: '',
            horasTrabajadas: 0,
            tiendaId: null,
          };
        }
        this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
      });
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId }; // Asegurar que se copie el tiendaId
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    this.modalService.abrirModal(MODAL_OPEN_DELAY_MS);
  }

  cerrarModal(): void {
    this.isSubmitting = true; // Deshabilitar el botón durante la animación
    this.modalService.cerrarModal(MODAL_CLOSE_DELAY_MS);

    setTimeout(() => {
      this.isSubmitting = false; // Rehabilitar el botón después de que termine la animación
    }, MODAL_CLOSE_DELAY_MS); // Debe coincidir con la duración de la animación CSS
  }

  resetearEstadoModal(): void {
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = crearTurnoVacio();
  }

  manejarTurnoGuardado(): void {
    if (this.vistaMensual) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      this.turnosModificados.emit();
    } else {
      // La semana que se está viendo ya está en diasSemana$ — no hace falta
      // recalcularla desde cero (antes volvía a pedir todas las semanas del
      // mes para terminar buscando esta misma).
      const semanaActual = this.diasSemana$.value;
      if (semanaActual.length > 0) {
        this.turnos$ = this.cargarTurnosDeSemana(semanaActual);
      }
      this.turnosModificados.emit();
    }
  }

  manejarTurnoEliminado(): void {
    this.manejarTurnoGuardado();
  }

  //! Métodos de cálculo de horas

  formatearHora(hora: string | undefined): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }

  formatearHorasDia(number: number | undefined): string {
    if (!number) return '00:00';

    const horas = Math.floor(number);
    const minutos = Math.round((number - horas) * 60);

    return `${horas.toString().padStart(2, '0')}:${minutos
      .toString()
      .padStart(2, '0')}`;
  }


  //! Métodos de actualización de UI
  actualizarNombreMes(): void {
    this.nombreMesActual = this.calendarioService.obtenerNombreMes(
      this.turnoStateService.getSemanaActual() // ✅ Obtener la fecha actual desde `TurnoStateService`
    );
  }

  trackByColaboradorId(_index: number, colaborador: Colaborador): number {
    return colaborador.id;
  }
}
