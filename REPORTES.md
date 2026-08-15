# Reportes — ShiftSystemSportCenter

Documento vivo que registra el avance del roadmap de reportes del repo
actual (distinto del rebuild v2 — ver memoria `rebuild-v2-alcance`, que es
un proyecto aparte). Nace de un análisis completo de qué reportes le sirven
al negocio (14 ago 2026, transcrito abajo) y se actualiza cada vez que se
cierra una fase, para no tener que re-derivar el estado en cada sesión
nueva. Si hay diferencia entre este documento y el código, gana el código —
acá se explica el *criterio* y el *estado*, no el detalle de implementación.

## Qué reportes hacen falta, y por qué

| Reporte | Decisión que permite tomar | Prioridad |
|---|---|---|
| Preliquidación mensual | Entregar a contabilidad horas programadas por persona, empresa y periodo | Muy alta |
| Análisis de colaborador | Detectar carga irregular, distribución entre tiendas y semanas críticas | Muy alta |
| Excepciones y calidad | Detectar feriados mal clasificados, jornadas extensas, datos futuros o inconsistentes | Muy alta |
| Cobertura por tienda | Saber cuántas personas y horas están programadas por tienda/día | Alta |
| Resumen operativo | Saber qué requiere atención sin recorrer tablas | Media |
| Detalle de turnos | Auditar el origen de cualquier total y exportarlo | Necesario, como drill-down (ya existe: `horas-trabajadas`) |

No se persigue calcular nómina real todavía: con el modelo actual, todo lo
que sigue es **horas programadas**, no horas trabajadas ni liquidación.
Faltan datos de dominio que no existen hoy: asistencia real vs. programada,
jornada contractual, tarifa/sueldo, reglas de horas extra, vigencia de
contrato, cierre aprobado. Cuando se decida construir eso, va aparte
(Turno programado / Asistencia real / Cálculo de liquidación / Cierre
aprobado como conceptos separados) — no se mete sueldo directo en
`Colaborador`.

## Roadmap y estado

- [x] **Fase 1 — Corregir semántica, totales y backfill de feriados.**
      CERRADA antes de este documento: `66f591c` (sincronizar estado de
      feriados y navegación semanal), `7829e7f` (corregir totales de
      feriados y filtros de colaboradores vacíos), `a87de84` (filtrar
      turnos recientes por rango, estadísticas del perfil).

- [x] **Fase 2 — Consultas agregadas en backend.** CERRADA 14 ago 2026.
      `TurnoRepository.sumarizarPorColaboradorYDia`/`YTienda` (SQL nativo,
      `GROUP BY`) reemplazan las sumas en memoria para reportes nuevos.
      `TurnoService` (reportes viejos: horas-trabajadas, turnos-feriados,
      resumen-mensual) no se tocó — sigue sumando en Java, se migra reporte
      por reporte si hace falta, no de una.

- [x] **Fase 3 — Preliquidación mensual + exportación.** CERRADA 14 ago
      2026. `GET /api/reportes/preliquidacion?mes&anio&empresaId&umbralHorasDiarias`
      (`ReporteController`/`ReporteService`, `PreliquidacionMensualDTO`) +
      vista `/reportes/preliquidacion` (diseño propio, ver más abajo) +
      export Excel de 2 hojas (Resumen/Detalle, `ExportExcelComponent`
      ahora soporta `[sheets]` además de `[data]`/`[columns]`). Verificado
      cruzando totales contra `/api/turnos/resumen-mensual` (deben
      coincidir exactamente — mismo cálculo, dos caminos).

- [ ] **Fase 4 — Rediseñar análisis de colaborador.** PENDIENTE. Reescribir
      `colaborador-profile` como ficha analítica (sin rankings de
      desempeño): horas del periodo, promedio semanal, semanas críticas,
      distribución por tienda, tabla de excepciones. Evaluar qué mover a
      queries agregadas de backend (hoy `calcularEstadisticasSemanales` es
      client-side) en vez de recalcular en Angular.

- [ ] **Fase 5 — Excepciones y calidad de datos.** PENDIENTE. El más
      importante para prevenir errores administrativos, aunque no sea
      "bonito": feriados mal marcados, jornadas por encima de un umbral,
      turnos de colaboradores deshabilitados, solapamientos, turnos sin
      empresa/tienda/puesto, turnos futuros fuera de horizonte.

- [ ] **Fase 6 — Portada-resumen compacta.** PENDIENTE. No es un dashboard
      grande: horas programadas del periodo, horas en feriado, colaboradores
      con carga excepcional, incidencias de calidad pendientes, una
      tendencia semanal (normal vs. feriado), una barra horizontal de horas
      por tienda, una tabla corta de "requiere atención". Cada elemento
      abre el reporte filtrado que lo explica — si un gráfico no lleva a
      una acción, no entra.

- [ ] **Cobertura por tienda.** Prioridad Alta pero sin número de fase
      todavía — no estaba en el orden de implementación original. Sin una
      definición de "dotación necesaria" (tienda + puesto + día/franja +
      cantidad mínima) solo puede mostrar cobertura existente, no déficit
      real. A calendarizar después de la Fase 4 o 5, según qué duela más
      en ese momento.

- [ ] **Fase 7 — Asistencia, contratos y cierres (nómina real).** FUERA DE
      ALCANCE por ahora. Requiere modelo de dominio nuevo (contratos con
      `vigenteDesde`/`vigenteHasta`, asistencia real separada de turno
      programado, cierre aprobado con historial). Solo se retoma si se
      decide construir liquidación real y no únicamente horas programadas.

## Decisiones de diseño ya tomadas (no volver a preguntar)

- **Reportes nuevos = solo lectura.** No persisten estado
  (pendiente/revisado/cerrado) ni observaciones; se recalculan siempre
  desde los turnos. Se reconsidera recién en la Fase 7, cuando exista un
  motivo real para "congelar" un periodo.
- **Sin horas diurnas/nocturnas**: no hay franja horaria definida en el
  dominio (`Turno` no la tiene).
- **"Horas extra candidatas"**: señal aproximada, no cálculo legal. Umbral
  diario configurable (8h por defecto vía query param
  `umbralHorasDiarias`), sin umbral semanal — ver
  `ReporteService.UMBRAL_HORAS_DIARIAS_DEFAULT`.
- **"Turnos partidos"**: se infiere de más de un `Turno` el mismo día para
  el mismo colaborador. No hay relación "turno partido" explícita en el
  modelo (deuda ya documentada como fuera de alcance en el plan de
  mantenibilidad previo).
- **Diseño visual de los reportes nuevos: libertad completa.** No replicar
  la composición de `horas-trabajadas`/`turnos-feriados` (toolbar elevado +
  `<table>`). Sí usar los tokens del design system (`tokens.css`,
  `DESIGN.md`) y los átomos genéricos (`app-button`, `app-badge`,
  `app-empty-state`, `app-skeleton`) donde encajen. Ver memoria
  `preferencia-libertad-disenio-reportes-nuevos`.
- **Estructura de navegación objetivo** (migración gradual, no de una):
  ```
  Reportes
  ├── Resumen                  (Fase 6)
  ├── Preliquidación mensual   (Fase 3 — listo)
  ├── Colaboradores            (Fase 4)
  ├── Cobertura por tienda     (sin fase asignada)
  └── Excepciones              (Fase 5)
  ```
  "Turnos en feriados" pasa a ser un desglose/filtro de preliquidación.
  "Horas trabajadas" queda como el detalle de turnos programados
  (drill-down). "Semana normal" no es un reporte — pertenece al módulo de
  Turnos, no a esta sección.

## Próximo paso sugerido

Fase 4 — Análisis de colaborador.

## Cómo se actualiza este documento

Al cerrar una fase: mover su casillero a `[x]`, anotar la fecha y qué se
entregó (endpoint/vista/archivos clave — no el detalle línea por línea, eso
vive en el código y en `git log`), y actualizar "Próximo paso sugerido".
Si una decisión de diseño cambia, corregir la sección de decisiones en vez
de dejar dos versiones contradictorias.
