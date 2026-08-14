import { Pipe, PipeTransform } from '@angular/core';

/**
 * Primera palabra de un string — para nombres/apellidos compuestos
 * ("Marvin Edhir", "Herrera Ordoñez") en las vistas de calendario (semanal
 * y selector de la mensual), donde el nombre completo se corta a 2 líneas
 * y ocupa espacio que ahí se necesita para las celdas de turno. Solo
 * cambia lo que se MUESTRA — el dato real (`colaborador.nombre`/`apellido`
 * completos) no se toca, así que el resto de la app (Colaboradores,
 * Reportes, turnos-masivos-modal) sigue mostrando el nombre completo.
 */
@Pipe({
  name: 'primeraPalabra',
  standalone: true,
})
export class PrimeraPalabraPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim().split(/\s+/)[0];
  }
}
