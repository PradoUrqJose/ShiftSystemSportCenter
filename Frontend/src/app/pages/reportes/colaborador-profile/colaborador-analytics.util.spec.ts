import { Turno } from '../../../services/turno.service';
import {
  calcularComposicion,
  calcularDistribucionTiendas,
  calcularExcepciones,
  calcularResumenSemanal,
  formatearFechaLocal,
} from './colaborador-analytics.util';

function turno(datos: Partial<Turno>): Turno {
  return {
    id: datos.id ?? 1,
    nombreColaborador: 'Ana',
    dniColaborador: '12345678',
    nombreEmpresa: 'Empresa',
    fecha: datos.fecha ?? '2026-07-06',
    horaEntrada: datos.horaEntrada ?? '08:00:00',
    horaSalida: datos.horaSalida ?? '16:00:00',
    ...datos,
  };
}

describe('colaborador analytics', () => {
  it('formatea fechas locales sin desplazarlas por UTC', () => {
    const fechaNocturnaEnLima = new Date(2026, 0, 1, 23, 30);
    expect(formatearFechaLocal(fechaNocturnaEnLima)).toBe('2026-01-01');
  });

  it('separa horas normales y de feriado sin duplicarlas', () => {
    const resumen = calcularComposicion([
      turno({ horasTrabajadas: 8, esFeriado: false }),
      turno({ id: 2, horasTrabajadas: 6, esFeriado: true }),
    ]);

    expect(resumen.horasNormales).toBe(8);
    expect(resumen.horasFeriados).toBe(6);
    expect(resumen.totalTurnosFeriados).toBe(1);
    expect(resumen.porcentajeHorasNormales + resumen.porcentajeHorasFeriados).toBeCloseTo(100, 8);
  });

  it('calcula carga solo con semanas completas y con actividad', () => {
    const resumen = calcularResumenSemanal([
      turno({ fecha: '2026-07-01', horasTrabajadas: 30 }), // semana parcial inicial
      turno({ id: 2, fecha: '2026-07-06', horasTrabajadas: 40 }),
      turno({ id: 3, fecha: '2026-07-13', horasTrabajadas: 50 }),
      turno({ id: 4, fecha: '2026-08-10', horasTrabajadas: 70 }), // semana actual incompleta
    ], '2026-07-01', '2026-08-31', new Date(2026, 7, 14, 12));

    expect(resumen.semanasConActividad).toBe(2);
    expect(resumen.promedioSemanal).toBe(45);
    expect(resumen.semanasMayorCarga.map(s => s.horas)).toEqual([50, 40]);
  });

  it('agrupa por día los turnos partidos y aplica el umbral recibido', () => {
    const excepciones = calcularExcepciones([
      turno({ fecha: '2026-07-28', horasTrabajadas: 4, esFeriado: true }),
      turno({ id: 2, fecha: '2026-07-28', horasTrabajadas: 5, esFeriado: true }),
    ], 8);

    expect(excepciones).toEqual([jasmine.objectContaining({
      fecha: '2026-07-28',
      horas: 9,
      cantidadTurnos: 2,
      partido: true,
      horasExtra: true,
      esFeriado: true,
    })]);
  });

  it('distribuye las horas por tienda sobre el total del período', () => {
    const distribucion = calcularDistribucionTiendas([
      turno({ nombreTienda: 'Tienda 1', horasTrabajadas: 6 }),
      turno({ id: 2, nombreTienda: 'Tienda 2', horasTrabajadas: 2 }),
    ]);

    expect(distribucion.map(t => t.nombre)).toEqual(['Tienda 1', 'Tienda 2']);
    expect(distribucion.map(t => t.porcentaje)).toEqual([75, 25]);
  });
});
