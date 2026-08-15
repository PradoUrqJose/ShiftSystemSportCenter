import { addWeeks, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { Turno } from '../../../services/turno.service';

export interface SemanaCarga {
  inicio: string;
  fin: string;
  horas: number;
}

export interface DistribucionTiendaVista {
  nombre: string;
  horas: number;
  porcentaje: number;
}

export interface ExcepcionDia {
  fecha: string;
  horas: number;
  cantidadTurnos: number;
  esFeriado: boolean;
  partido: boolean;
  horasExtra: boolean;
}

export interface ResumenComposicion {
  horasNormales: number;
  horasFeriados: number;
  porcentajeHorasNormales: number;
  porcentajeHorasFeriados: number;
  totalTurnosFeriados: number;
}

export interface ResumenSemanal {
  promedioSemanal: number;
  semanasConActividad: number;
  semanasMayorCarga: SemanaCarga[];
}

export function formatearFechaLocal(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd');
}

export function calcularComposicion(turnos: Turno[]): ResumenComposicion {
  const horasTotales = turnos.reduce((sum, turno) => sum + (turno.horasTrabajadas ?? 0), 0);
  const turnosFeriados = turnos.filter(turno => !!turno.esFeriado);
  const horasFeriados = turnosFeriados.reduce((sum, turno) => sum + (turno.horasTrabajadas ?? 0), 0);
  const horasNormales = Math.max(0, horasTotales - horasFeriados);

  return {
    horasNormales,
    horasFeriados,
    porcentajeHorasNormales: horasTotales > 0 ? (horasNormales / horasTotales) * 100 : 0,
    porcentajeHorasFeriados: horasTotales > 0 ? (horasFeriados / horasTotales) * 100 : 0,
    totalTurnosFeriados: turnosFeriados.length,
  };
}

/**
 * Resume únicamente semanas completas y con al menos un turno. Sin jornada
 * contractual ni vigencia laboral no es correcto interpretar una semana en
 * cero como "baja carga": podría estar fuera del período de trabajo real.
 * La semana actual también se excluye porque todavía está incompleta.
 */
export function calcularResumenSemanal(
  turnos: Turno[],
  fechaInicio: string,
  fechaFin: string,
  hoy: Date = new Date(),
): ResumenSemanal {
  const desde = parseISO(fechaInicio);
  const hasta = parseISO(fechaFin);
  const inicioSemanaActual = startOfWeek(hoy, { weekStartsOn: 1 });

  let primeraSemanaCompleta = startOfWeek(desde, { weekStartsOn: 1 });
  if (primeraSemanaCompleta < desde) {
    primeraSemanaCompleta = addWeeks(primeraSemanaCompleta, 1);
  }

  const horasPorSemana = new Map<string, number>();
  turnos.forEach(turno => {
    const inicioSemana = startOfWeek(parseISO(turno.fecha), { weekStartsOn: 1 });
    if (inicioSemana < primeraSemanaCompleta || inicioSemana >= inicioSemanaActual) return;
    if (endOfWeek(inicioSemana, { weekStartsOn: 1 }) > hasta) return;

    const clave = format(inicioSemana, 'yyyy-MM-dd');
    horasPorSemana.set(clave, (horasPorSemana.get(clave) ?? 0) + (turno.horasTrabajadas ?? 0));
  });

  const semanas = Array.from(horasPorSemana.entries()).map(([inicio, horas]) => {
    const inicioSemana = parseISO(inicio);
    return {
      inicio: format(inicioSemana, 'dd/MM'),
      fin: format(endOfWeek(inicioSemana, { weekStartsOn: 1 }), 'dd/MM'),
      horas,
    };
  });

  const promedioSemanal = semanas.length
    ? semanas.reduce((sum, semana) => sum + semana.horas, 0) / semanas.length
    : 0;

  return {
    promedioSemanal,
    semanasConActividad: semanas.length,
    semanasMayorCarga: [...semanas].sort((a, b) => b.horas - a.horas).slice(0, 4),
  };
}

export function calcularExcepciones(turnos: Turno[], umbralHorasDiarias: number): ExcepcionDia[] {
  const porDia = new Map<string, { horas: number; cantidad: number; esFeriado: boolean }>();

  turnos.forEach(turno => {
    const actual = porDia.get(turno.fecha) ?? { horas: 0, cantidad: 0, esFeriado: false };
    actual.horas += turno.horasTrabajadas ?? 0;
    actual.cantidad += 1;
    actual.esFeriado ||= !!turno.esFeriado;
    porDia.set(turno.fecha, actual);
  });

  return Array.from(porDia, ([fecha, dia]) => ({
    fecha,
    horas: dia.horas,
    cantidadTurnos: dia.cantidad,
    esFeriado: dia.esFeriado,
    partido: dia.cantidad > 1,
    horasExtra: dia.horas > umbralHorasDiarias,
  }))
    .filter(dia => dia.partido || dia.horasExtra)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function calcularDistribucionTiendas(turnos: Turno[]): DistribucionTiendaVista[] {
  const horasPorTienda = new Map<string, number>();
  turnos.forEach(turno => {
    const tienda = turno.nombreTienda || 'Sin Tienda';
    horasPorTienda.set(tienda, (horasPorTienda.get(tienda) ?? 0) + (turno.horasTrabajadas ?? 0));
  });

  const totalHoras = Array.from(horasPorTienda.values()).reduce((sum, horas) => sum + horas, 0);
  return Array.from(horasPorTienda, ([nombre, horas]) => ({
    nombre,
    horas,
    porcentaje: totalHoras > 0 ? (horas / totalHoras) * 100 : 0,
  })).sort((a, b) => b.horas - a.horas);
}
