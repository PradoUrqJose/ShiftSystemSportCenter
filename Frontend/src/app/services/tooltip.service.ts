import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import tippy, { Instance as TippyInstance } from 'tippy.js';

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
      // Fila extra si el turno cruza la ventana de almuerzo (ver Turno.java
      // isTomoAlmuerzo — se descuentan 45min automáticamente). Es la única
      // señal de este dato: la pill solo tiene el color de su barra de
      // acento (a pedido de Jose, sin badge aparte), así que el detalle
      // completo vive acá.
      const tieneAlmuerzo = nativeElement.getAttribute('data-almuerzo') === 'true';
      const filaAlmuerzo = tieneAlmuerzo
        ? `<div class="turno-tooltip__row turno-tooltip__row--warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>
            <span class="turno-tooltip__label">Almuerzo descontado</span>
            <span class="turno-tooltip__value">-45 min</span>
          </div>`
        : '';
      const instancia = tippy(nativeElement, {
        content: `
          <div class="turno-tooltip">
            <div class="turno-tooltip__store">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6"/></svg>
              ${tiendaNombre}
            </div>
            <div class="turno-tooltip__row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
              <span class="turno-tooltip__label">Horas trabajadas</span>
              <span class="turno-tooltip__value">${horasTrabajadas}</span>
            </div>
            ${filaAlmuerzo}
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
