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

// -------------- RxJS Imports --------------
import { BehaviorSubject, combineLatest, map, Observable, of, Subject, takeUntil } from 'rxjs';

// -------------- Angular Modules Imports --------------
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// -------------- External Libraries Imports --------------
import Notiflix from 'notiflix';
import { ModalService } from '../../services/modal.service';
import { TurnosCalendarService } from '../../services/turnos-calendar.service';
import { HeaderComponent } from './header/header.component';
import { WeeklyViewComponent } from './weekly-view/weekly-view.component';
import { MonthlyViewComponent } from './monthly-view/monthly-view.component';
import { FilterBarComponent } from '../../components/filter-bar/filter-bar.component';
import { MODAL_OPEN_DELAY_MS, MODAL_CLOSE_DELAY_MS } from '../../utils/modal-timing';

import { TurnoModalComponent } from './turno-modal/turno-modal.component'; // Nuevo componente
import { TurnosMasivosModalComponent } from './turnos-masivos-modal/turnos-masivos-modal.component';

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, WeeklyViewComponent, MonthlyViewComponent, TurnoModalComponent, FilterBarComponent, TurnosMasivosModalComponent],
  // TurnosCalendarService: una instancia propia por página (no singleton),
  // dueña de qué semana/mes se muestra y qué turnos trae — ver el servicio.
  providers: [TurnosCalendarService],
})
export default class TurnosComponent implements OnInit, OnDestroy {
  //! Variables de estado
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  colaboradoresFiltrados$: Observable<Colaborador[]> = of([]);
  tiendas$: Observable<Tienda[]> = of([]); // Observable de tiendas
  isSubmitting: boolean = false; // Bandera para deshabilitar el botón de envío
  copiandoSemana: boolean = false; // Bandera para deshabilitar "Copiar semana anterior" mientras corre

  //? Manejo de modal de Turnos Masivos
  mostrarModalTurnosMasivos: boolean = false;
  isModalTurnosMasivosVisible: boolean = false;

  //? Manejo de MODAL
  mostrarModal$!: Observable<boolean>;
  isModalVisible$!: Observable<boolean>;

  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno
  turnoActual: Turno = crearTurnoVacio(); // Turno actual

  colaboradoresSeleccionadosSemana: number[] = []; // Filtro multi-select semanal
  selectedCompanyForMonthly: string = 'all';
  private selectedCompanyForMonthly$ = new BehaviorSubject<string>('all');
  private selectedCollaboratorsFilter$ = new BehaviorSubject<number[]>([]);
  @Output() turnosModificados = new EventEmitter<void>(); // Nuevo evento para notificar cambios

  private readonly destroy$ = new Subject<void>(); // Emite al destruir el componente, corta todas las suscripciones abiertas

  constructor(
    public calendario: TurnosCalendarService,
    private turnoService: TurnoService,
    private modalService: ModalService,
    private colaboradorService: ColaboradorService,
    private tiendaService: TiendaService,
    private cdr: ChangeDetectorRef
  ) {
    this.colaboradores$ =
      this.colaboradorService.getColaboradoresPorHabilitacion(true); // Obtener colaboradores
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
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
    this.calendario.inicializar();
    this.cargarTiendas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      this.calendario.colaboradorSeleccionado = ids.length === 1 ? ids[0] : 0;
      if (this.calendario.vistaMensual && this.calendario.colaboradorSeleccionado) {
        this.calendario.mostrarTurnosMensuales(this.calendario.colaboradorSeleccionado);
      }
      this.selectedCollaboratorsFilter$.next(this.colaboradoresSeleccionadosSemana);
    } else {
      const id = ids || 0;
      this.calendario.colaboradorSeleccionado = id;
      if (this.calendario.vistaMensual && id) this.calendario.mostrarTurnosMensuales(id);
      this.selectedCollaboratorsFilter$.next(this.colaboradoresSeleccionadosSemana);
    }
  }

  //? Cambio de vista
  toggleVistaMensual(data: string): void {
    this.calendario.toggleVistaMensual(data);
  }

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService.getTiendas(); // Sin ordenamiento aquí
  }

  //! Métodos de navegación
  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    this.calendario.cambiarMes(direccion);
    this.cdr.detectChanges(); // Forzar detección de cambios
  }

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.calendario.cambiarSemana(direccion, () => this.cdr.detectChanges());
  }

  // Método para manejar el cambio de semana o mes
  cambiarSemanaOMesHandler(direccion: 'anterior' | 'siguiente'): void {
    if (this.calendario.vistaMensual) {
      this.cambiarMes(direccion);
    } else {
      this.cambiarSemana(direccion);
    }
  }

  copiarSemanaAnterior(): void {
    if (this.copiandoSemana) return;

    Notiflix.Confirm.show(
      'Copiar semana anterior',
      'Se van a duplicar los turnos de la semana pasada en la semana actual. Los días que ya tengan un turno cargado no se van a tocar. ¿Continuar?',
      'Copiar',
      'Cancelar',
      () => {
        this.copiandoSemana = true;
        this.calendario.copiarSemanaAnterior().pipe(takeUntil(this.destroy$)).subscribe({
          next: ({ creados, omitidos }) => {
            this.copiandoSemana = false;
            if (creados === 0 && omitidos === 0) {
              Notiflix.Notify.info('La semana anterior no tiene turnos para copiar', {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              });
              return;
            }
            if (creados === 0) {
              Notiflix.Notify.info(`Ya había turnos cargados en los ${omitidos} día(s) con datos; no se copió nada nuevo`, {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              });
              return;
            }
            const detalleOmitidos = omitidos > 0 ? `, ${omitidos} omitido(s) por ya tener turno` : '';
            Notiflix.Notify.success(`${creados} turno(s) copiado(s) de la semana anterior${detalleOmitidos}`, {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
            this.manejarTurnoGuardado();
          },
          error: (err) => {
            this.copiandoSemana = false;
            Notiflix.Notify.failure(err.message || 'Error al copiar la semana anterior', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
        });
      },
      () => {}
    );
  }

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

  //! Métodos de modal de Turnos Masivos
  abrirModalTurnosMasivos(): void {
    this.mostrarModalTurnosMasivos = true;
    setTimeout(() => (this.isModalTurnosMasivosVisible = true), MODAL_OPEN_DELAY_MS);
  }

  cerrarModalTurnosMasivos(): void {
    this.isModalTurnosMasivosVisible = false;
    setTimeout(() => (this.mostrarModalTurnosMasivos = false), MODAL_CLOSE_DELAY_MS);
  }

  manejarTurnosMasivosCreados(): void {
    this.manejarTurnoGuardado();
  }

  resetearEstadoModal(): void {
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = crearTurnoVacio();
  }

  manejarTurnoGuardado(): void {
    if (this.calendario.vistaMensual) {
      this.calendario.mostrarTurnosMensuales(this.calendario.colaboradorSeleccionado);
      this.turnosModificados.emit();
    } else {
      // La semana que se está viendo ya está en diasSemana$ — no hace falta
      // recalcularla desde cero (antes volvía a pedir todas las semanas del
      // mes para terminar buscando esta misma).
      const semanaActual = this.calendario.diasSemana$.value;
      if (semanaActual.length > 0) {
        this.calendario.turnos$ = this.calendario.cargarTurnosDeSemana(semanaActual);
      }
      this.turnosModificados.emit();
    }
  }

  manejarTurnoEliminado(): void {
    this.manejarTurnoGuardado();
  }

  trackByColaboradorId(_index: number, colaborador: Colaborador): number {
    return colaborador.id;
  }
}
