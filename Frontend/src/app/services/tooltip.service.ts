import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away-extreme.css';
import 'tippy.js/themes/light.css';

// Sin `providedIn: 'root'` a propósito: cada componente que muestra celdas de
// turno (weekly-view, monthly-view) lo declara en su propio `providers`, así
// cada uno maneja sus propias instancias de Tippy sin pisarse — y Angular
// llama a ngOnDestroy() de este servicio solo cuando se destruye el
// componente que lo provee (por ejemplo al cambiar de vista semanal a
// mensual), así que los tooltips viejos siempre se limpian.
//
// Antes esto vivía en turnos.component.ts (el padre) y usaba
// document.querySelectorAll('.container-green') para encontrar las celdas —
// pero esas celdas están en el template de estos componentes hijos, y
// @ViewChild/@ViewChildren de Angular no puede cruzar esa frontera de
// encapsulación. La búsqueda directa en el DOM era un workaround real a esa
// limitación, no descuido. Ahora cada vista usa su propio @ViewChildren
// (dentro de su propio template) y le pasa los elementos a este servicio.
@Injectable()
export class TooltipService implements OnDestroy {
  private instancias: TippyInstance[] = [];

  inicializar(elementos: ElementRef<HTMLElement>[]): void {
    // Antes de crear tooltips nuevos, destruir los de la pasada anterior: si
    // no, cada re-render (cambio de semana/mes) apila instancias de Tippy
    // sobre elementos DOM que ya no existen y nunca se liberan.
    this.destruir();

    elementos.forEach(({ nativeElement }) => {
      const horasTrabajadas = nativeElement.getAttribute('data-horas-trabajadas');
      const tiendaNombre = nativeElement.getAttribute('data-tienda');
      // Línea extra si el turno cruza la ventana de almuerzo (ver Turno.java
      // isTomoAlmuerzo — se descuentan 45min automáticamente). Antes esto
      // solo se comunicaba con el color de la barra de acento de la pill;
      // ahora la pill lleva un badge visual ("-45m") y el detalle completo
      // vive acá, en el mismo tooltip que ya se muestra al hover — un
      // tooltip propio del badge quedaba tapado por el z-index de Tippy.
      const tieneAlmuerzo = nativeElement.getAttribute('data-almuerzo') === 'true';
      const lineaAlmuerzo = tieneAlmuerzo
        ? '<div class="text-amber-700 text-sm mt-1">🍽 Se descontaron 45 min de almuerzo</div>'
        : '';
      const instancia = tippy(nativeElement, {
        content: `
          <div class="p-2 flex justify-center flex-col text-center">
            <div class="font-bold mb-2 text-gray-800">Información del Turno</div>
            <div class="mb-1 text-gray-700 text-sm"><strong>Total horas:</strong> ${horasTrabajadas}</div>
            <div class="text-gray-700 font-bold">${tiendaNombre}</div>
            ${lineaAlmuerzo}
          </div>
        `,
        placement: 'top',
        arrow: true,
        theme: 'custom',
        animation: 'shift-away-extreme',
        delay: [50, 200],
        allowHTML: true,
      });
      this.instancias.push(instancia);
    });
  }

  destruir(): void {
    this.instancias.forEach((instancia) => instancia.destroy());
    this.instancias = [];
  }

  ngOnDestroy(): void {
    this.destruir();
  }
}
