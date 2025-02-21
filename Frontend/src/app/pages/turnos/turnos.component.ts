import { DiaSemana } from './../../services/calendario.service';
// -------------- Core Angular Imports --------------
import {
  Component,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';

// -------------- Service Imports --------------
import {
  TurnoService,
  Turno,
  TurnoPayload,
} from './../../services/turno.service';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { TiendaService, Tienda } from '../../services/tienda.service';
import { FeriadoService, Feriado } from '../../services/feriado.service';

// -------------- Date-fns and Date-fns-TZ Imports --------------
import {
  startOfMonth,
  format,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale'; // Importación de la localización para español

// -------------- RxJS Imports --------------
import { BehaviorSubject, catchError, finalize, map, Observable, of, switchMap, tap } from 'rxjs';

// -------------- Angular Modules Imports --------------
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// -------------- External Libraries Imports --------------
import Notiflix from 'notiflix'; // Notificación en la UI
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
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule, HeaderComponent, WeeklyViewComponent, MonthlyViewComponent],
})
export default class TurnosComponent implements OnInit {
  //! Variables de estado
  feriados: Feriado[] = []; // Lista de feriados
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = ''; // Nombre del mes actual
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  turnos$: Observable<Turno[]> = of([]); // Observable de turnos
  tiendas$: Observable<Tienda[]> = of([]); // Observable de tiendas
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>(
    []
  ); // Días de la semana
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
  tiendaActual: Tienda = this.resetTienda(); // Tienda actual
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

    this.cargarSemana();
    this.cargarTiendas();
    this.actualizarNombreMes();

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
    if (colaboradorId !== null) {
      this.colaboradorSeleccionado = colaboradorId;

      const semanaActual = this.turnoStateService.getSemanaActual();

      this.turnosMensuales$ = this.turnoService.getTurnosMensualesPorColaborador(
        colaboradorId,
        semanaActual.getMonth() + 1,
        semanaActual.getFullYear()
      );

      this.turnosMensuales$.subscribe(() => {
        // Usar el servicio en lugar de método local
        this.semanasDelMes = this.calendarioService.completarSemanasDelMes(
          this.semanasDelMes,
          semanaActual.getMonth() + 1,
          semanaActual.getFullYear()
        );
      });
    }
    console.log("✅ Cargando turnos mensuales para colaborador ID:", colaboradorId);
    setTimeout(() => {
      this.inicializarTooltips();
    }, 500);
  }

  //? Cambio de vista
  toggleVistaMensual(data: string): void {
    const nuevaVistaMensual = data === 'month';

    this.turnoStateService.setVistaMensual(nuevaVistaMensual); // ✅ Guardamos la vista en el servicio

    console.log(data);

    if (nuevaVistaMensual) {
      // ✅ Ajustamos la semana actual al primer día del mes
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

    this.turnoService.getSemanasDelMes(mes, anio).subscribe({
      next: (semanas) => {
        const numeroSemana = this.calcularNumeroSemana(semanaActual, semanas);
        this.calendarioService.obtenerSemana(semanaActual).subscribe({
          next: (dias) => this.diasSemana$.next(dias),
          error: (error) => console.error('Error al obtener semana:', error)
        });
        this.turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana).subscribe({
          next: (turnos) => {
            this.turnos$ = of(turnos);
            setTimeout(() => this.inicializarTooltips(), 500);
            this.turnoStateService.setLoading(false);
          },
          error: (error) => {
            console.error('Error al cargar turnos:', error);
            this.turnos$ = of([]);
            this.turnoStateService.setLoading(false);
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener semanas del mes:', error);
        this.turnos$ = of([]);
        this.turnoStateService.setLoading(false);
      }
    });

    this.actualizarNombreMes();
  }

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService
      .getTiendas()
      .pipe(map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b))));
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

  resetTienda(): Tienda {
    return { id: 0, nombre: '', direccion: '' };
  }

  //! Métodos de ordenamiento
  private customSort(a: Tienda, b: Tienda): number {
    const numA = this.extractNumber(a.nombre);
    const numB = this.extractNumber(b.nombre);

    // Caso 1: Ambos son Tienda numerada
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    // Caso 2: Solo A es Tienda numerada
    else if (numA !== null) {
      return -1;
    }
    // Caso 3: Solo B es Tienda numerada
    else if (numB !== null) {
      return 1;
    }
    // Caso 4: Ninguno es Tienda numerada - orden alfabético
    else {
      return a.nombre.localeCompare(b.nombre);
    }
  }

  private extractNumber(nombre: string): number | null {
    const match = nombre.match(/Tienda (\d+)/);
    return match ? parseInt(match[1], 10) : null;
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
  }


  //? Cambiar Semana Lógica Completa <-----------------------------------


  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.turnoStateService.setLoading(true); // Indicar que está cargando
    this.semanaService.cambiarSemana(direccion).subscribe({
      next: ({ nuevaSemana, turnos }) => {
        // Actualizar los días de la semana
        this.diasSemana$.next(nuevaSemana);

        // Obtener la fecha actualizada del estado
        const semanaActual = this.turnoStateService.getSemanaActual();
        const mes = semanaActual.getMonth() + 1; // getMonth() devuelve 0-11, sumamos 1 para 1-12
        const anio = semanaActual.getFullYear();

        // Calcular el número de semana dentro del mes
        this.turnoService.getSemanasDelMes(mes, anio).subscribe({
          next: (semanas) => {
            const numeroSemana = this.calcularNumeroSemana(semanaActual, semanas);

            console.log("Cambiar Semana");
            // Actualizar los turnos con getTurnosPorSemanaEstricta
            this.turnos$ = this.turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana);

            // Actualizar el nombre del mes y tooltips
            this.actualizarNombreMes();
            setTimeout(() => this.inicializarTooltips(), 500);
            this.turnoStateService.setLoading(false);
          },
          error: (error) => {
            console.error('Error al obtener semanas del mes:', error);
            this.turnoStateService.setLoading(false);
          }
        });
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
      });

    this.modalService.abrirModal(50); // ✅ Usamos el servicio

  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId }; // Asegurar que se copie el tiendaId
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    this.modalService.abrirModal(50); // ✅ Usamos el servicio
  }

  abrirModalAgregarTienda(): void {
    // Cerrar primero el modal de gestión si está abierto
    if (this.mostrarModalGestionarTiendas) {
      this.cerrarModalGestionarTiendas();
    }

    this.mostrarModalAgregarTienda = true;
    setTimeout(() => {
      this.isModalAgregarTiendaVisible = true;
    }, 50);
  }

  cerrarModalAgregarTienda(): void {
    this.isModalAgregarTiendaVisible = false;
    setTimeout(() => {
      this.mostrarModalAgregarTienda = false;
      this.tiendaActual = this.resetTienda(); // Resetear formulario
    }, 300);
  }

  abrirModalGestionarTiendas(): void {
    // Cerrar primero el modal de agregar si está abierto
    if (this.mostrarModalAgregarTienda) {
      this.cerrarModalAgregarTienda();
    }

    this.mostrarModalGestionarTiendas = true;
    setTimeout(() => {
      this.isModalGestionarTiendasVisible = true;
    }, 50);
  }

  cerrarModalGestionarTiendas(): void {
    this.isModalGestionarTiendasVisible = false;
    setTimeout(() => {
      this.mostrarModalGestionarTiendas = false;
    }, 300);
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

  //! Métodos de guardado y eliminación
  guardarTurno(): void {
    if (this.isSubmitting) return; // ✅ Evitar múltiples envíos
    this.isSubmitting = true;

    this.errorHoraEntrada = null;
    this.errorHoraSalida = null;

    this.validarHorarioEntrada();
    this.validarHorarioSalida();

    if (!this.turnoActual.tiendaId) {
      this.isSubmitting = false;
      Notiflix.Notify.failure('Debes seleccionar una tienda', {
        position: 'right-bottom',
        cssAnimationStyle: 'from-right',
      });
      return;
    }

    if (this.errorHoraEntrada || this.errorHoraSalida) {
      this.isSubmitting = false;
      return;
    }

    // ✅ Validación adicional de horas
    const horaEntrada = this.formatearHora(this.turnoActual.horaEntrada);
    const horaSalida = this.formatearHora(this.turnoActual.horaSalida);
    if (horaEntrada >= horaSalida) {
      this.errorHoraSalida = 'La hora de salida debe ser posterior a la hora de entrada.';
      this.isSubmitting = false;
      return;
    }

    // ✅ Preparar datos para enviar al backend
    const turnoParaGuardar: TurnoPayload = {
      colaborador: { id: this.turnoActual.colaboradorId },
      fecha: this.turnoActual.fecha,
      horaEntrada: this.turnoActual.horaEntrada,
      horaSalida: this.turnoActual.horaSalida,
      empresa: { id: this.turnoActual.empresaId! },
      tienda: { id: this.turnoActual.tiendaId! },
    };

    console.log('Datos enviados al backend:', turnoParaGuardar);

    // ✅ Determinar si es creación o actualización
    const operacion = this.turnoActual.id
      ? this.turnoService.updateTurno(this.turnoActual.id, turnoParaGuardar)
      : this.turnoService.addTurno(turnoParaGuardar);

    operacion
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          const vistaMensual = this.vistaMensual; // ✅ Usamos la variable local

          if (vistaMensual) {
            this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
          } else {
            this.turnos$ = this.turnoService.getTurnosPorSemana(
              this.turnoStateService.getSemanaActual()
            );
          }

          setTimeout(() => this.inicializarTooltips(), 500);
          this.cerrarModal();

          Notiflix.Notify.success(
            this.turnoActual.id ? 'Turno actualizado con éxito' : 'Turno creado con éxito',
            {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            }
          );
        },
        error: (error: any) => {
          console.log('Detalles del error:', error);
          Notiflix.Notify.failure(error.error?.message || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
      });
  }

  eliminarTurno(): void {
    if (!this.turnoActual.id) return;

    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este turno?',
      'Eliminar',
      'Cancelar',
      () => {
        // ✅ Eliminar el turno
        this.turnoService.deleteTurno(this.turnoActual.id!).subscribe({
          next: () => {
            if (this.vistaMensual) {
              this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
            } else {
              this.turnos$ = this.turnoService.getTurnosPorSemana(
                this.turnoStateService.getSemanaActual()
              );
              this.turnos$.subscribe(() => {
                setTimeout(() => this.inicializarTooltips(), 500);
              });
            }

            this.cerrarModal();

            Notiflix.Notify.success('Turno eliminado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error) => {
            console.error('❌ Error al eliminar el turno:', error);
            Notiflix.Notify.failure('Error al eliminar el turno', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
        });
      },
      () => {
        console.log('Eliminación cancelada');
      }
    );
  }

  //! Métodos de validación
  validarHorarioEntrada(): void {
    let hora = this.turnoActual.horaEntrada;
    if (!hora) {
      this.errorHoraEntrada = 'La hora de entrada es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora); // Limpiar segundos
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 5 || horas > 22 || (horas === 22 && minutos > 0)) {
      this.errorHoraEntrada =
        'La hora de entrada debe ser entre las 5:00 AM y las 10:00 PM.';
    } else {
      this.errorHoraEntrada = null; // Sin errores
    }
  }

  validarHorarioSalida(): void {
    let hora = this.turnoActual.horaSalida;
    if (!hora) {
      this.errorHoraSalida = 'La hora de salida es obligatoria.';
      return;
    }

    hora = this.formatearHora(hora); // Limpiar segundos
    const [horas, minutos] = hora.split(':').map(Number);

    if (horas < 10 || (horas === 0 && minutos > 0) || horas > 24) {
      this.errorHoraSalida =
        'La hora de salida debe ser entre las 10:00 AM y las 12:00 AM.';
    } else {
      this.errorHoraSalida = null; // Sin errores
    }
  }

  seRealizaronCambios(): boolean {
    if (!this.turnoOriginal) {
      return true; // Si no hay un turno original (modo agregar), se permite guardar
    }

    return (
      this.turnoActual.horaEntrada !== this.turnoOriginal.horaEntrada ||
      this.turnoActual.horaSalida !== this.turnoOriginal.horaSalida ||
      this.turnoActual.fecha !== this.turnoOriginal.fecha ||
      this.turnoActual.tiendaId !== this.turnoOriginal.tiendaId
    );
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

  //! Métodos de gestión de tiendas
  guardarTienda(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    if (this.tiendaActual.id) {
      this.tiendaService
        .updateTienda(this.tiendaActual.id, this.tiendaActual)
        .subscribe({
          next: () => {
            this.cargarTiendas();
            this.cerrarModalAgregarTienda();
            this.isSubmitting = false;
            Notiflix.Notify.success('Tienda actualizada con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error) => {
            this.isSubmitting = false;
            Notiflix.Notify.failure(
              error.error?.message || 'Error desconocido',
              {
                position: 'right-bottom',
                cssAnimationStyle: 'from-right',
              }
            );
          },
        });
    } else {
      this.tiendaService.addTienda(this.tiendaActual).subscribe({
        next: () => {
          this.cargarTiendas();
          this.cerrarModalAgregarTienda();
          this.isSubmitting = false;
          Notiflix.Notify.success('Tienda creada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          Notiflix.Notify.failure(error.error?.message || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
      });
    }
  }

  editarTienda(tienda: Tienda): void {
    this.tiendaActual = { ...tienda };
    this.abrirModalAgregarTienda();
  }

  eliminarTienda(id: number): void {
    Notiflix.Confirm.show(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar esta tienda?',
      'Eliminar',
      'Cancelar',
      () => {
        this.tiendaService.deleteTienda(id).subscribe(() => {
          this.cargarTiendas();
          Notiflix.Notify.success('Tienda eliminada con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        });
      },
      () => {
        console.log('Eliminación cancelada');
      }
    );
  }

  //! Métodos de actualización de UI
  actualizarNombreMes(): void {
    this.nombreMesActual = this.calendarioService.obtenerNombreMes(
      this.turnoStateService.getSemanaActual() // ✅ Obtener la fecha actual desde `TurnoStateService`
    );
  }

  inicializarTooltips(): void {
    const elementosTurnos = document.querySelectorAll('.container-green');
    elementosTurnos.forEach((elemento) => {
      const horasTrabajadas = elemento.getAttribute('data-horas-trabajadas');
      const tiendaNombre = elemento.getAttribute('data-tienda');
      tippy(elemento, {
        content: `
          <div class="p-2  flex justify-center flex-col text-center">
            <div class="font-bold mb-2 text-gray-800">Información del Turno</div>
            <div class="mb-1 text-gray-700 text-sm"><strong>Total horas:</strong> ${horasTrabajadas}</div>
            <div class="text-gray-700 font-bold">${tiendaNombre}</div>
          </div>
        `,
        placement: 'top',
        arrow: true,
        theme: 'custom', // Aplica el tema personalizado
        animation: 'shift-away-extreme',
        delay: [50, 200], // 50ms de retraso al mostrar, 200ms al ocultar
        allowHTML: true, // Permitir HTML en el contenido del tooltip
      });
    });
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
