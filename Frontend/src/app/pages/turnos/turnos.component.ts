// -------------- Core Angular Imports --------------
import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';

// -------------- Service Imports --------------
import {
  TurnoService,
  Turno,
  TurnoPayload,
  DiaSemana,
} from './../../services/turno.service';
import {
  ColaboradorService,
  Colaborador,
} from '../../services/colaborador.service';
import { TiendaService, Tienda } from '../../services/tienda.service';
import { FeriadoService, Feriado } from '../../services/feriado.service';

// -------------- Date-fns and Date-fns-TZ Imports --------------
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz'; // Función para convertir a la zona horaria especificada
import { es } from 'date-fns/locale'; // Importación de la localización para español

// -------------- RxJS Imports --------------
import { BehaviorSubject, map, Observable, of, switchMap } from 'rxjs';

// -------------- Angular Modules Imports --------------
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// -------------- External Libraries Imports --------------
import Notiflix from 'notiflix'; // Notificación en la UI
import tippy from 'tippy.js'; // Herramienta para tooltips interactivos
import 'tippy.js/dist/tippy.css'; // Estilos de Tippy.js
import 'tippy.js/animations/shift-away-extreme.css'; // Animación de Tippy.js
import 'tippy.js/themes/light.css'; // Tema claro de Tippy.js

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule, FormsModule],
})
export default class TurnosComponent implements OnInit, AfterViewInit {
  //! Variables de estado
  feriados: Feriado[] = []; // Lista de feriados
  isLoading: boolean = false; // Controla el spinner de carga
  nombreMesActual: string = ''; // Nombre del mes actual
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  turnos$: Observable<Turno[]> = of([]); // Observable de turnos
  tiendas$: Observable<Tienda[]> = of([]); // Observable de tiendas
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>(
    []
  ); // Días de la semana
  semanaActual: Date = new Date(); // Fecha actual de la semana
  isSubmitting: boolean = false; // Bandera para deshabilitar el botón de envío

  //? Manejo de MODAL
  mostrarModal: boolean = false; // Controla la visibilidad del modal
  isModalVisible: boolean = false; // Controla la animación del modal

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
  vistaMensual: boolean = false; // Controla la vista mensual
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
    private colaboradorService: ColaboradorService,
    private feriadoService: FeriadoService, // Inyectar el servicio de feriados
    private tiendaService: TiendaService,
    private cdr: ChangeDetectorRef
  ) {
    this.colaboradores$ =
      this.colaboradorService.getColaboradoresPorHabilitacion(true); // Obtener colaboradores
    this.nombreMesActual = format(this.semanaActual, 'MMMM yyyy', {
      locale: es,
    });
  }

  //! Métodos del ciclo de vida
  ngOnInit(): void {
    this.cargarSemana();
    this.cargarTiendas();
    this.actualizarNombreMes();
    this.cargarFeriados(); // Cargar feriados al iniciar
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
    setTimeout(() => {
      this.inicializarTooltips();
    }, 0);
  }

  //! Métodos de carga de datos
  cargarFeriados(): void {
    this.feriadoService.getFeriados().subscribe({
      next: (data) => {
        this.feriados = data; // Guardar los feriados
      },
      error: (error) => {
        console.error('Error al cargar los feriados:', error);
      },
    });
  }

  cargarMes(): void {
    this.isLoading = true; // Activar el spinner

    this.turnoService
      .getSemanasDelMes(
        this.semanaActual.getMonth() + 1,
        this.semanaActual.getFullYear()
      )
      .subscribe(
        (semanas) => {
          console.log('📌 Semanas del mes recibidas:', semanas);

          // ✅ Aplicar completarSemanasDelMes para asegurar los días sobrantes
          this.semanasDelMes = this.completarSemanasDelMes(
            semanas,
            this.semanaActual.getMonth() + 1,
            this.semanaActual.getFullYear()
          );

          this.diasMes = this.semanasDelMes.flat(); // Opcional, para manipulación de días

          this.turnos$.subscribe(() => {
            this.inicializarTooltips();
            this.isLoading = false; // Ocultar el spinner después de cargar los datos
          });
        },
        (error) => {
          console.error('❌ Error al obtener semanas del mes:', error);
          this.isLoading = false;
        }
      );
  }

  //? Mostrar Turnos mensuales
  mostrarTurnosMensuales(colaboradorId: number): void {
    if (colaboradorId !== null) {
      this.colaboradorSeleccionado = colaboradorId;

      this.turnosMensuales$ = this.turnoService.getTurnosMensualesPorColaborador(
        colaboradorId,
        this.semanaActual.getMonth() + 1,
        this.semanaActual.getFullYear()
      );

      this.turnosMensuales$.subscribe(() => {
        // 📌 Volver a completar las semanas para restaurar días sobrantes
        this.semanasDelMes = this.completarSemanasDelMes(
          this.semanasDelMes,
          this.semanaActual.getMonth() + 1,
          this.semanaActual.getFullYear()
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
    if (this.vistaMensual === nuevaVistaMensual) {
      return; // Si la vista ya está activa, no hacer nada
    }

    this.vistaMensual = nuevaVistaMensual;
    console.log(data);
    if (this.vistaMensual) {
      // Ajustar semanaActual al primer día del mes al cambiar a vista mensual, PARA ERROR DE MES SIGUIENTE
      this.semanaActual = startOfMonth(this.semanaActual);
      this.cargarMes();
    } else {
      this.cargarSemana();
    }
    this.actualizarNombreMes();
  }

  cargarSemana(): void {
    this.isLoading = true; // Mostrar el spinner antes de la solicitud

    this.turnoService
      .getSemanasDelMes(
        this.semanaActual.getMonth() + 1,
        this.semanaActual.getFullYear()
      )
      .subscribe(
        (semanas) => {
          console.log('📌 Semanas recibidas del backend:', semanas); // LOG IMPORTANTE

          this.semanasDelMes = semanas; // Guardamos las semanas recibidas

          // Encontrar la semana actual dentro de la lista
          const semanaEncontrada = this.semanasDelMes.find((semana) =>
            semana.some(
              (dia) => dia.fecha === format(this.semanaActual, 'yyyy-MM-dd')
            )
          );

          console.log('📌 Semana encontrada:', semanaEncontrada); // LOG IMPORTANTE

          // Si no encuentra la semana, carga la primera semana
          this.diasSemana$.next(semanaEncontrada ?? this.semanasDelMes[0]);

          // Cargar turnos de la semana actual
          this.turnos$ = this.turnoService.getTurnosPorSemana(
            this.semanaActual
          );
          this.turnos$.subscribe(() => {
            setTimeout(() => this.inicializarTooltips(), 500);
            this.isLoading = false; // Ocultar el spinner después de cargar los datos
          });
        },
        () => {
          this.isLoading = false; // Ocultar el spinner si hay un error
        }
      );
  }

  //? ----------------------> Método Completar Semana y mes con celdas Vacías
  // Asegura que cada semana tenga 7 días, agregando días vacíos si es necesario
  completarSemana(semana: DiaSemana[] | null): DiaSemana[] {
    if (!semana) return [];

    let semanaCompleta = [...semana]; // Copiar la semana
    const diasFaltantes = 7 - semanaCompleta.length; // Días que faltan para completar la semana

    // Si hay días faltantes, agregarlos al inicio en lugar de al final
    for (let i = 0; i < diasFaltantes; i++) {
      semanaCompleta.unshift({
        fecha: 'empty', // Indicador de celda vacía
        nombre: '',
        dayNumber: '',
        monthNombre: '',
        yearName: '',
        esFeriado: false,
      });
    }

    return semanaCompleta;
  }

  completarSemanasDelMes(semanas: DiaSemana[][], mesActual: number, anioActual: number): DiaSemana[][] {
    if (!semanas || semanas.length === 0) return [];

    return semanas.map((semana, index) => {
      let nuevaSemana = [...semana];

      // 📌 Agregar días del mes anterior si la primera semana no empieza en lunes
      if (index === 0) {
        const primerDiaReal = new Date(semana[0].fecha);
        const diaSemana = primerDiaReal.getDay(); // 0 (Domingo) - 6 (Sábado)

        if (diaSemana > 0) { // Si no es lunes
          const mesPrevio = mesActual === 1 ? 12 : mesActual - 1;
          const anioPrevio = mesActual === 1 ? anioActual - 1 : anioActual;
          const diasMesPrevio = new Date(anioPrevio, mesPrevio, 0).getDate(); // Último día del mes anterior

          const diasSobrantes = [];
          for (let i = diaSemana - 1; i >= 0; i--) {
            diasSobrantes.push({
              fecha: `${anioPrevio}-${String(mesPrevio).padStart(2, "0")}-${String(diasMesPrevio - i).padStart(2, "0")}`,
              nombre: format(new Date(anioPrevio, mesPrevio - 1, diasMesPrevio - i), "EEE", { locale: es }),
              dayNumber: String(diasMesPrevio - i),
              monthNombre: format(new Date(anioPrevio, mesPrevio - 1, 1), "MMMM", { locale: es }),
              yearName: String(anioPrevio),
              esSobrante: true, // 🔴 Indica que es del mes anterior
            });
          }
          nuevaSemana = [...diasSobrantes, ...nuevaSemana]; // Asegura el orden correcto
        }
      }

      // 📌 Agregar días del mes siguiente si la última semana no termina en domingo
      if (index === semanas.length - 1) {
        const ultimoDiaReal = new Date(nuevaSemana[nuevaSemana.length - 1].fecha);
        let siguienteDia = new Date(ultimoDiaReal);
        siguienteDia.setDate(1); // 📌 Asegurar que empieza en el primer día del mes siguiente

        const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;
        const anioSiguiente = mesActual === 12 ? anioActual + 1 : anioActual;

        while (nuevaSemana.length < 7) {
          nuevaSemana.push({
            fecha: `${anioSiguiente}-${String(mesSiguiente).padStart(2, "0")}-${String(siguienteDia.getDate()).padStart(2, "0")}`,
            nombre: format(siguienteDia, "EEE", { locale: es }),
            dayNumber: format(siguienteDia, "d"),
            monthNombre: format(siguienteDia, "MMMM", { locale: es }),
            yearName: format(siguienteDia, "yyyy"),
            esSobrante: true, // 🔴 Indica que es del mes siguiente
          });
          siguienteDia.setDate(siguienteDia.getDate() + 1);
        }
      }

      return nuevaSemana;
    });
  }

  //? ---------------------->

  cargarTiendas(): void {
    this.tiendas$ = this.tiendaService
      .getTiendas()
      .pipe(map((tiendas) => tiendas.sort((a, b) => this.customSort(a, b))));
  }

  //! Métodos de utilidad
  esFeriado(fecha: string): boolean {
    return this.feriados.some((feriado) => feriado.fecha === fecha);
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
    this.semanaActual =
      direccion === 'anterior'
        ? subMonths(this.semanaActual, 1)
        : addMonths(this.semanaActual, 1);
    this.cargarMes();
    if (this.colaboradorSeleccionado) {
      this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
    }
    this.actualizarNombreMes();
  }

  //? Cambiar Semana Lógica Completa <-----------------------------------

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.isLoading = true; // Activar el spinner

    this.turnoService
      .getSemanasDelMes(
        this.semanaActual.getMonth() + 1,
        this.semanaActual.getFullYear()
      )
      .subscribe(
        (semanas) => {
          let indiceSemanaActual = this.obtenerIndiceSemanaActual(semanas);

          if (direccion === 'anterior') {
            if (indiceSemanaActual > 0) {
              indiceSemanaActual--;
            } else {
              this.cargarSemanaDeOtroMes('anterior');
              return;
            }
          } else {
            if (indiceSemanaActual < semanas.length - 1) {
              indiceSemanaActual++;
            } else {
              this.cargarSemanaDeOtroMes('siguiente');
              return;
            }
          }

          this.actualizarSemana(semanas[indiceSemanaActual]);
        },
        (error) => {
          console.error('❌ Error al cargar semanas:', error);
          this.isLoading = false;
        }
      );
  }

  //* Obtiene el índice de la semana actual dentro del array de semanas.
  private obtenerIndiceSemanaActual(semanas: DiaSemana[][]): number {
    return semanas.findIndex((semana) =>
      semana.some(
        (dia) =>
          dia.fecha !== 'filler' &&
          dia.fecha === format(this.semanaActual, 'yyyy-MM-dd')
      )
    );
  }

  //* Carga la semana de otro mes cuando se intenta cambiar desde la primera o última semana del mes
  private cargarSemanaDeOtroMes(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual =
      direccion === 'anterior'
        ? subMonths(this.semanaActual, 1)
        : addMonths(this.semanaActual, 1);

    this.turnoService
      .getSemanasDelMes(
        this.semanaActual.getMonth() + 1,
        this.semanaActual.getFullYear()
      )
      .subscribe(
        (semanas) => {
          if (semanas.length > 0) {
            const semanaSeleccionada =
              direccion === 'anterior'
                ? semanas[semanas.length - 1]
                : semanas[0];
            this.actualizarSemana(semanaSeleccionada);
          } else {
            console.warn(
              `⚠️ No se encontraron semanas en el mes ${
                direccion === 'anterior' ? 'anterior' : 'siguiente'
              }.`
            );
          }
        },
        (error) => {
          console.error(
            `❌ Error al cargar semanas del mes ${
              direccion === 'anterior' ? 'anterior' : 'siguiente'
            }:`,
            error
          );
          this.isLoading = false;
        }
      );
  }

  //* Actualiza la semana actual y los turnos
  private actualizarSemana(nuevaSemana: DiaSemana[]): void {
    const primerDiaValido = nuevaSemana.find((dia) => dia.fecha !== 'filler');

    if (primerDiaValido) {
      const [year, month, day] = primerDiaValido.fecha.split('-').map(Number);
      this.semanaActual = new Date(year, month - 1, day);
    }

    this.diasSemana$.next(nuevaSemana);
    this.actualizarNombreMes();

    // ✅ Volver a cargar los turnos de la semana seleccionada
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual);
    this.turnos$.subscribe(() => {
      setTimeout(() => this.inicializarTooltips(), 500);
      this.isLoading = false;
    });
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

    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true;
    }, 50);
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal(); // Resetear estado del modal
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId }; // Asegurar que se copie el tiendaId
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    this.mostrarModal = true;
    setTimeout(() => {
      this.isModalVisible = true; // Activar la animación
    }, 50);
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
    this.isModalVisible = false; // Desactivar la animación

    setTimeout(() => {
      this.mostrarModal = false; // Ocultar el modal completamente
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
    if (this.isSubmitting) return; // Evitar múltiples envíos
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
      this.isSubmitting = false; // Rehabilitar el botón en caso de error
      return; // Si hay errores, no continúa
    }

    // Validación adicional de que la hora de salida es posterior a la hora de entrada
    const horaEntrada = this.formatearHora(this.turnoActual.horaEntrada);
    const horaSalida = this.formatearHora(this.turnoActual.horaSalida);
    if (horaEntrada >= horaSalida) {
      this.errorHoraSalida =
        'La hora de salida debe ser posterior a la hora de entrada.';
      this.isSubmitting = false; // Rehabilitar el botón en caso de error
      return; // Si la validación falla, no continúa
    }

    // Preparar datos para enviar al backend
    const turnoParaGuardar: TurnoPayload = {
      colaborador: { id: this.turnoActual.colaboradorId }, // Usar el ID del colaborador
      fecha: this.turnoActual.fecha,
      horaEntrada: this.turnoActual.horaEntrada,
      horaSalida: this.turnoActual.horaSalida,
      empresa: { id: this.turnoActual.empresaId! }, // Usar el ID de la empresa
      tienda: { id: this.turnoActual.tiendaId! },
    };

    console.log('Datos enviados al backend:', turnoParaGuardar);

    if (this.turnoActual.id) {
      // Actualizar turno existente
      this.turnoService
        .updateTurno(this.turnoActual.id, turnoParaGuardar)
        .subscribe({
          next: () => {
            if (this.vistaMensual) {
              this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
            } else {
              this.turnos$ = this.turnoService.getTurnosPorSemana(
                this.semanaActual
              );
            }
            setTimeout(() => this.inicializarTooltips(), 500); // Inicializa tooltips después de que los datos se carguen
            this.cerrarModal();
            this.isSubmitting = false; // Rehabilitar el botón después de la operación
            Notiflix.Notify.success('Turno actualizado con éxito', {
              position: 'right-bottom',
              cssAnimationStyle: 'from-right',
            });
          },
          error: (error: any) => {
            this.isSubmitting = false; // Rehabilitar el botón en caso de error
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
      // Si no hay ID, estamos creando un nuevo turno
      this.turnoService.addTurno(turnoParaGuardar).subscribe({
        next: () => {
          if (this.vistaMensual) {
            this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
          } else {
            this.turnos$ = this.turnoService.getTurnosPorSemana(
              this.semanaActual
            );
          }
          setTimeout(() => this.inicializarTooltips(), 500); // Inicializa tooltips después de que los datos se carguen
          this.cerrarModal();
          this.isSubmitting = false; // Rehabilitar el botón después de la operación
          Notiflix.Notify.success('Turno creado con éxito', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
        error: (error: any) => {
          this.isSubmitting = false; // Rehabilitar el botón en caso de error
          console.log('Detalles del error:', error);
          Notiflix.Notify.failure(error.error?.message || 'Error desconocido', {
            position: 'right-bottom',
            cssAnimationStyle: 'from-right',
          });
        },
      });
    }
  }

  eliminarTurno(): void {
    if (this.turnoActual.id) {
      Notiflix.Confirm.show(
        'Confirmar Eliminación', // Título del modal
        '¿Estás seguro de que deseas eliminar este turno?', // Mensaje
        'Eliminar', // Texto del botón "Eliminar"
        'Cancelar', // Texto del botón "Cancelar"
        () => {
          // Acción al confirmar
          this.turnoService.deleteTurno(this.turnoActual.id!).subscribe(() => {
            if (this.vistaMensual) {
              this.mostrarTurnosMensuales(this.colaboradorSeleccionado);
            } else {
              this.turnos$ = this.turnoService.getTurnosPorSemana(
                this.semanaActual
              ); // Actualizar lista
            }
            setTimeout(() => this.inicializarTooltips(), 50); // Inicializa tooltips después de que los datos se carguen
            this.cerrarModal(); // Cerrar el modal
          });
        },
        () => {
          // Acción al cancelar
          console.log('Eliminación cancelada');
        }
      );
    }
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

  getHorasTotalesSemanaFormateadas(
    colaboradorId: number,
    turnos: Turno[] | null
  ): string {
    if (!turnos) return '00:00'; // Si no hay turnos, devolver 00:00

    const turnoColaborador = turnos.find(
      (t) => t.colaboradorId === colaboradorId
    );
    const horasTotales = turnoColaborador
      ? turnoColaborador.horasTotalesSemana ?? 0
      : 0;

    const horas = Math.floor(horasTotales); // Parte entera (horas)
    const minutos = Math.round((horasTotales - horas) * 60); // Convertir parte decimal a minutos

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(
      2,
      '0'
    )}`; // Formato HH:mm
  }

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
    this.nombreMesActual = format(this.semanaActual, 'MMMM yyyy', {
      locale: es,
    });
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
    return turnos.find(
      (turno) => turno.colaboradorId === colaboradorId && turno.fecha === fecha
    ); // Cambiar las llaves {} por paréntesis ()
  }
}
