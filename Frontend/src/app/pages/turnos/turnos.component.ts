import { DiaSemana } from './../../services/calendario.service';
// -------------- Core Angular Imports --------------
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Output,
  EventEmitter,
  AfterViewChecked,
} from '@angular/core';

// -------------- Service Imports --------------
import {
  TurnoService,
  Turno,
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
import { BehaviorSubject, map, Observable, of, Subscription, tap} from 'rxjs';

// -------------- Angular Modules Imports --------------
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// -------------- External Libraries Imports --------------
import tippy from 'tippy.js'; // Herramienta para tooltips interactivos
import 'tippy.js/dist/tippy.css'; // Estilos de Tippy.js
import 'tippy.js/animations/shift-away-extreme.css'; // Animación de Tippy.js
import 'tippy.js/themes/light.css'; // Tema claro de Tippy.js
import { TurnoStateService } from '../../services/turno-state.service';
import { ModalService } from '../../services/modal.service';
import { CalendarioService } from '../../services/calendario.service';
import { SemanaService } from '../../services/semana.service';
import { HeaderComponent } from './header/header.component';
import { WeeklyViewComponent } from './weekly-view/weekly-view.component';
import { MonthlyViewComponent } from './monthly-view/monthly-view.component';

import { TurnoModalComponent } from './turno-modal/turno-modal.component'; // Nuevo componente

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule, HeaderComponent, WeeklyViewComponent, MonthlyViewComponent, TurnoModalComponent],
})
export default class TurnosComponent implements OnInit, AfterViewChecked {
  //! Variables de estado
  feriados: Feriado[] = []; // Lista de feriados
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = ''; // Nombre del mes actual
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
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

  //* Validaciones de formulario
  errorHoraEntrada: string | null = null; // Error de hora de entrada
  errorHoraSalida: string | null = null; // Error de hora de salida
  turnoOriginal: Turno | null = null; // Almacena los datos originales del turno
  turnoActual: Turno = this.resetTurno(); // Turno actual

  //! Variables de vista
  vistaMensual!: boolean; // ✅ Variable para guardar el estado booleano de `vistaMensual$`
  diasMes: DiaSemana[] = []; // Días del mes
  turnosMensuales$: Observable<Turno[]> = of([]); // Turnos mensuales
  colaboradorSeleccionado: number = 0; // Colaborador seleccionado
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
  @Output() turnosModificados = new EventEmitter<void>(); // Nuevo evento para notificar cambios

  private turnosSubscription?: Subscription;
  private turnosMensualesSubscription?: Subscription;
  private needsTooltipInit: boolean = false; // Bandera para inicializar tooltips

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
  }

  //! Métodos del ciclo de vida
  ngOnInit(): void {
    // ✅ Asignamos las variables después de la inicialización
    this.isLoading$ = this.turnoStateService.isLoading$;
    this.turnoStateService.vistaMensual$.subscribe(value => {
      this.vistaMensual = value;
    });
    this.mostrarModal$ = this.modalService.mostrarModal$;
    this.isModalVisible$ = this.modalService.isModalVisible$;
    this.vistaMensual = false;
    this.cargarSemana();
    this.cargarTiendas();
    this.actualizarNombreMes();

  }

  ngAfterViewChecked(): void {
    if (this.needsTooltipInit && document.querySelectorAll('.container-green').length > 0) {
      this.inicializarTooltips();
      this.needsTooltipInit = false; // Evitar inicializaciones repetidas
      this.cdr.detectChanges();
    }
  }

  // Método para actualizar mes y año desde semanaActual
  private actualizarMesAnio(): void {
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.mes = semanaActual.getMonth() + 1; // getMonth() devuelve 0-11, sumamos 1 para 1-12
    this.anio = semanaActual.getFullYear();
  }

  cargarMes(): void {
    this.turnoStateService.setLoading(true);
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.calendarioService.obtenerSemanasDelMesConCompletado(semanaActual).subscribe({
      next: (semanas) => {
        this.semanasDelMes = semanas;
        this.diasMes = this.semanasDelMes.flat();
        this.turnoStateService.setLoading(false);
        this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
        this.needsTooltipInit = true; // Marcar para inicializar tooltips
      },
      error: (error) => {
        console.error('Error al cargar las semanas del mes:', error);
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
      ).pipe(
        tap(() => {
          this.needsTooltipInit = true; // Marcar para inicializar tooltips cuando los turnos estén listos
        })
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
    const mes = semanaActual.getMonth() + 1;
    const anio = semanaActual.getFullYear();

    this.calendarioService.obtenerSemanasDelMes(semanaActual).subscribe({
      next: (semanas) => {
        const semanaSeleccionada = semanas.find(semana =>
          semana.some(dia => dia.fecha === format(semanaActual, 'yyyy-MM-dd'))
        ) || semanas[0];
        this.diasSemana$.next(semanaSeleccionada);

        this.turnosSubscription?.unsubscribe();
        const numeroSemana = this.calcularNumeroSemana(semanaActual, semanas);
        this.turnos$ = this.turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana).pipe(
          tap(() => {
            this.needsTooltipInit = true; // Marcar para inicializar tooltips cuando los turnos estén listos
          })
        );
        this.turnoStateService.setLoading(false);
      },
      error: (error) => {
        console.error('Error al obtener semanas del mes:', error);
        this.turnos$ = of([]);
        this.diasSemana$.next([]);
        this.turnoStateService.setLoading(false);
      }
    });

    this.actualizarNombreMes();
  }

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService.getTiendas(); // Sin ordenamiento aquí
  }

  //! Métodos de utilidad
  esFeriado(fecha: string): boolean {
    return this.turnoService.esFeriado(fecha, this.feriados);
  }

  esDiaActual(fecha: string): boolean {
    const hoy = new Date();
    const [year, month, day] = fecha.split('-').map(Number); // Dividir y convertir a números
    const fechaComparar = new Date(year, month - 1, day); // Meses son 0-indexados en JavaScript
    // Normalizar ambas fechas a medianoche
    hoy.setHours(0, 0, 0, 0);
    fechaComparar.setHours(0, 0, 0, 0);

    return hoy.getTime() === fechaComparar.getTime();
  }

  actualizarResumenMensual(): void {
    if (this.colaboradorSeleccionado) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      this.needsTooltipInit = true; // Marcar para inicializar tooltips tras actualizar
    }
  }

  resetTurno(): Turno {
    return {
      id: 0,
      nombreColaborador: '',
      dniColaborador: '',
      nombreEmpresa: '',
      fecha: '',
      horaEntrada: '',
      horaSalida: '',
      horasTrabajadas: 0,
      tiendaId: null,
    };
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
    this.semanaService.cambiarSemana(direccion).subscribe({
      next: ({ nuevaSemana, turnos }) => {
        this.diasSemana$.next(nuevaSemana);
        const semanaActual = this.turnoStateService.getSemanaActual();
        const mes = semanaActual.getMonth() + 1;
        const anio = semanaActual.getFullYear();

        this.turnoService.getSemanasDelMes(mes, anio).subscribe({
          next: (semanas) => {
            const numeroSemana = this.calcularNumeroSemana(semanaActual, semanas);
            this.turnos$ = this.turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana).pipe(
              tap(() => {
                this.needsTooltipInit = true; // Marcar para inicializar tooltips
              })
            );
            this.actualizarNombreMes();
            this.turnoStateService.setLoading(false);
          },
          error: (error) => {
            console.error('Error al obtener semanas del mes:', error);
            this.turnoStateService.setLoading(false);
          }
        });
        this.actualizarMesAnio();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cambiar la semana:', error);
        this.turnoStateService.setLoading(false);
      },
    });
  }

  // Método auxiliar para calcular el número de semana
  private calcularNumeroSemana(fecha: Date, semanas: DiaSemana[][]): number {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    for (let i = 0; i < semanas.length; i++) {
      const semana = semanas[i];
      if (semana.some(dia => dia.fecha === fechaStr)) {
        return i + 1; // +1 porque las semanas empiezan en 1, no en 0
      }
    }
    return 1; // Valor por defecto si no se encuentra (puedes ajustar esto)
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
        )
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
        this.modalService.abrirModal(50);
      });
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId }; // Asegurar que se copie el tiendaId
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    this.modalService.abrirModal(50); // ✅ Usamos el servicio
  }

  cerrarModal(): void {
    this.isSubmitting = true; // Deshabilitar el botón durante la animación
    this.modalService.cerrarModal(300); // ✅ Cerrar modal usando el servicio

    setTimeout(() => {
      this.isSubmitting = false; // Rehabilitar el botón después de que termine la animación
    }, 300); // Debe coincidir con la duración de la animación (300ms)
  }

  resetearEstadoModal(): void {
    this.errorHoraEntrada = null; // Limpiar error de hora de entrada
    this.errorHoraSalida = null; // Limpiar error de hora de salida
    this.turnoOriginal = null; // Resetear turno original
    this.turnoActual = this.resetTurno();
  }

  manejarTurnoGuardado(): void {
    if (this.vistaMensual) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
      this.turnosModificados.emit();
    } else {
      const semanaActual = this.turnoStateService.getSemanaActual();
      const mes = semanaActual.getMonth() + 1;
      const anio = semanaActual.getFullYear();

      this.calendarioService.obtenerSemanasDelMes(semanaActual).subscribe({
        next: (semanas) => {
          const numeroSemana = this.calcularNumeroSemana(semanaActual, semanas);
          this.turnos$ = this.turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana).pipe(
            tap(() => {
              this.needsTooltipInit = true; // Marcar para inicializar tooltips
            })
          );
          this.turnosModificados.emit();
        }
      });
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

  inicializarTooltips(): void {
    const elementosTurnos = document.querySelectorAll('.container-green');
    if (elementosTurnos.length > 0) {
      elementosTurnos.forEach((elemento) => {
        const horasTrabajadas = elemento.getAttribute('data-horas-trabajadas');
        const tiendaNombre = elemento.getAttribute('data-tienda');
        tippy(elemento, {
          content: `
            <div class="p-2 flex justify-center flex-col text-center">
              <div class="font-bold mb-2 text-gray-800">Información del Turno</div>
              <div class="mb-1 text-gray-700 text-sm"><strong>Total horas:</strong> ${horasTrabajadas}</div>
              <div class="text-gray-700 font-bold">${tiendaNombre}</div>
            </div>
          `,
          placement: 'top',
          arrow: true,
          theme: 'custom',
          animation: 'shift-away-extreme',
          delay: [50, 200],
          allowHTML: true,
        });
      });
    }
  }

  //! Métodos de obtención de datos
  obtenerTurno(
    turnos: Turno[] | null,
    colaboradorId: number,
    fecha: string
  ): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return this.turnoService.obtenerTurno(turnos, colaboradorId, fecha) || undefined;
  }
}
