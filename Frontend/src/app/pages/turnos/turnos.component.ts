import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TurnoService, Turno } from '../../services/turno.service';
import { ColaboradorService, Colaborador } from '../../services/colaborador.service';
import { MatDialog } from '@angular/material/dialog';
import { addDays, subDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import TurnoModalComponent from '../turno-modal/turno-modal.component';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

interface DiaSemana {
  fecha: string;
  nombre: string;
  dayNumber: string;
  monthNombre: string;
  yearName: string;
}

@Component({
  selector: 'app-turnos',
  templateUrl: './turnos.component.html',
  standalone: true,
  styleUrls: ['./turnos.component.css'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush // Usamos OnPush para optimizar Change Detection
})
export default class TurnosComponent implements OnInit {
  colaboradores$: Observable<Colaborador[]>; // Observable de colaboradores
  turnos$: Observable<Turno[]>; // Observable de turnos
  diasSemana$: BehaviorSubject<DiaSemana[]> = new BehaviorSubject<DiaSemana[]>([]); // Semana observable
  semanaActual: Date = new Date();

  constructor(
    private turnoService: TurnoService,
    private colaboradorService: ColaboradorService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef // Inyectamos ChangeDetectorRef
  ) {
    this.colaboradores$ = this.colaboradorService.getColaboradores(); // Obtener colaboradores
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Obtener turnos iniciales
  }

  ngOnInit(): void {
    this.cargarSemana();
  }

  cargarSemana(): void {
    const inicioSemana = startOfWeek(this.semanaActual, { weekStartsOn: 1 });
    const dias = Array.from({ length: 7 }, (_, i) => {
      const fecha = addDays(inicioSemana, i);
      return {
        fecha: format(fecha, 'yyyy-MM-dd'),
        nombre: format(fecha, 'EEE', { locale: es }),
        dayNumber: format(fecha, 'dd'),
        monthNombre: format(fecha, 'MMMM', { locale: es }),
        yearName: format(fecha, 'yyyy')
      };
    });
    this.diasSemana$.next(dias); // Actualizamos los días de la semana
  }

  cambiarSemana(direccion: 'anterior' | 'siguiente'): void {
    this.semanaActual = direccion === 'anterior'
      ? subDays(this.semanaActual, 7)
      : addDays(this.semanaActual, 7);
    this.cargarSemana();
    this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual); // Actualizamos los turnos
  }

  abrirModal(colaboradorId: number, fecha: string): void {
    const dialogRef = this.dialog.open(TurnoModalComponent, {
      data: { colaboradorId, fecha }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        // Recargar turnos y forzar detección
        this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual);
        this.cdr.detectChanges(); // Asegura que los cambios se reflejan
      }
    });
  }



  abrirModalEdicion(turno: Turno): void {
    const dialogRef = this.dialog.open(TurnoModalComponent, {
      data: { turno, colaboradorId: turno.colaborador.id, fecha: turno.fecha }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        // Recargar turnos después de eliminar o editar
        this.turnos$ = this.turnoService.getTurnosPorSemana(this.semanaActual);
        this.cdr.detectChanges(); // Forzar detección de cambios
      }
    });
  }



  obtenerTurno(turnos: Turno[] | null, colaboradorId: number, fecha: string): Turno | undefined {
    if (!turnos) return undefined; // Manejo de null
    return turnos.find(turno => turno.colaborador.id === colaboradorId && turno.fecha === fecha);
  }

  sumarHoras(turnos: Turno[] | null, colaboradorId: number): string {
    if (!turnos) return '00:00'; // Manejo de null
    const turnosColaborador = turnos.filter(t => t.colaborador.id === colaboradorId);
    const totalHoras = turnosColaborador.reduce((total, turno) => total + (turno.horasTrabajadas ?? 0), 0);
    const horas = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horas) * 60);

    // Formatear horas y minutos a dos dígitos
    const horasFormateadas = horas.toString().padStart(2, '0');
    const minutosFormateados = minutos.toString().padStart(2, '0');

    return `${horasFormateadas}:${minutosFormateados}`;
  }



  formatearHora(hora: string): string {
    if (!hora) return '00:00';
    const [horas, minutos] = hora.split(':');
    return `${horas}:${minutos}`;
  }
}
