import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { WeeklyViewComponent } from '../../turnos/weekly-view/weekly-view.component';
import { CalendarioService, DiaSemana } from '../../../services/calendario.service';
import { Colaborador, ColaboradorService } from '../../../services/colaborador.service';
import { Turno, TurnoService } from '../../../services/turno.service';
import { TurnoStateService } from '../../../services/turno-state.service';
import { SemanaService } from '../../../services/semana.service';
import { HeaderComponent } from '../../turnos/header/header.component';
import { CommonModule } from '@angular/common';
import { format, startOfWeek, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { RouterModule } from '@angular/router';
import { TurnoModalComponent } from '../../turnos/turno-modal/turno-modal.component'; // Importar el modal
import { ModalService } from '../../../services/modal.service';
import { TiendaService } from '../../../services/tienda.service';

@Component({
  selector: 'app-semana-normal',
  standalone: true,
  imports: [WeeklyViewComponent, HeaderComponent, CommonModule, RouterModule, TurnoModalComponent], // Añadir el modal aquí
  templateUrl: './semana-normal.component.html',
  styleUrls: ['./semana-normal.component.css']
})
export class SemanaNormalComponent implements OnInit {
  isLoading$!: Observable<boolean>;
  nombreMesActual: string = '';

  diasSemana$ = new BehaviorSubject<DiaSemana[]>([]);
  turnos$!: Observable<Turno[]>;
  colaboradores: Colaborador[] = [];

  // Propiedades para el modal
  mostrarModal$!: Observable<boolean>;
  isModalVisible$!: Observable<boolean>;
  turnoActual: Turno = this.resetTurno();
  turnoOriginal: Turno | null = null;
  tiendas$!: Observable<any[]>;

  constructor(
    private calendarioService: CalendarioService,
    private colaboradorService: ColaboradorService,
    private turnoService: TurnoService,
    private turnoStateService: TurnoStateService,
    private semanaService: SemanaService,
    private modalService: ModalService, // Inyectar ModalService
    private tiendaService: TiendaService // Inyectar TiendaService
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

  // Método para cargar datos iniciales
  cargarDatos(): void {
    this.turnoStateService.setLoading(true);

    const semanaActual = this.turnoStateService.getSemanaActual();
    this.cargarSemanaNormal(semanaActual);

    this.colaboradorService.getColaboradoresPorHabilitacion(true).subscribe({
      next: (colaboradores) => this.colaboradores = colaboradores,
      error: (error) => console.error('Error al cargar colaboradores:', error)
    });
  }

  // Método para cargar una semana normal (lunes a domingo)
  private cargarSemanaNormal(fecha: Date): void {
    const diasSemana = this.obtenerDiasSemanaNormal(fecha);
    this.diasSemana$.next(diasSemana);

    this.turnos$ = this.turnoService.getTurnosPorSemana(fecha);
    this.turnos$.subscribe({
      next: (turnos) => {
        console.log('Turnos cargados:', turnos);
        setTimeout(() => this.inicializarTooltips(), 500);
        this.turnoStateService.setLoading(false);
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
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
    console.log('Tooltips inicializados');
    // Implementar lógica de tooltips si es necesario
  }

  // Métodos para el modal
  abrirModal(event: { colaboradorId: number; fecha: string }): void {
    this.resetearEstadoModal();
    this.colaboradorService.getColaboradoresPorHabilitacion(true)
      .pipe(
        map((colaboradores) => colaboradores.find((c) => c.id === event.colaboradorId))
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
          this.modalService.abrirModal(50);
        }
      });
  }

  abrirModalEdicion(turno: Turno): void {
    this.resetearEstadoModal();
    this.turnoOriginal = { ...turno, tiendaId: turno.tiendaId };
    this.turnoActual = { ...turno, tiendaId: turno.tiendaId };
    this.modalService.abrirModal(50);
  }

  cerrarModal(): void {
    this.modalService.cerrarModal(300);
  }

  resetearEstadoModal(): void {
    this.turnoOriginal = null;
    this.turnoActual = this.resetTurno();
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

  manejarTurnoGuardado(): void {
    const semanaActual = this.turnoStateService.getSemanaActual();
    this.cargarSemanaNormal(semanaActual);
  }

  manejarTurnoEliminado(): void {
    this.manejarTurnoGuardado();
  }
}
