import { Pipe, PipeTransform } from '@angular/core';
import { Turno } from '../services/turno.service';

/**
 * Turnos de un colaborador en un día puntual, ordenados por hora de entrada.
 * Antes esto era un método (`obtenerTurnos`) duplicado en weekly-view y
 * monthly-view, llamado directo desde el template — Angular lo reevaluaba en
 * cada ciclo de detección de cambios, sin importar si `turnos` realmente
 * había cambiado, porque una llamada a método en el template no se memoiza.
 *
 * Un pipe *puro* (default) sí se memoiza: Angular solo vuelve a ejecutar
 * `transform` cuando alguno de sus argumentos cambia por referencia/valor —
 * en la práctica, solo cuando `turnos` cambia (llega un array nuevo del
 * backend) o cambia la celda (colaboradorId/fecha), no en cada tick.
 */
@Pipe({
  name: 'turnosDelDia',
  standalone: true,
})
export class TurnosDelDiaPipe implements PipeTransform {
  transform(turnos: Turno[] | null, colaboradorId: number, fecha: string): Turno[] {
    if (!turnos) return [];
    return turnos
      .filter((turno) => turno.colaboradorId === colaboradorId && turno.fecha === fecha)
      .sort((a, b) => {
        const horaA = a.horaEntrada || '00:00';
        const horaB = b.horaEntrada || '00:00';
        return horaA.localeCompare(horaB);
      });
  }
}
