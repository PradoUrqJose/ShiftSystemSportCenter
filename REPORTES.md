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
      `GROUP BY` por colaborador+empresa histórica) reemplazan las sumas en
      memoria para reportes nuevos.
      `TurnoService` (reportes viejos: horas-trabajadas, turnos-feriados,
      resumen-mensual) no se tocó — sigue sumando en Java, se migra reporte
      por reporte si hace falta, no de una.

- [x] **Fase 3 — Preliquidación mensual + exportación.** CERRADA 14 ago,
      con una corrección de fondo el 15 ago (mismo checkpoint que Fase 4,
      ver abajo). La implementación del 14 ago quedó funcional pero
      atribuía turnos históricos a la empresa *actual* del colaborador
      (`colaborador.getEmpresa()`) en vez de la empresa real del turno
      (`turno.empresa_id`) — si un colaborador cambió de empresa, todo su
      historial se mostraba bajo la empresa nueva, lo que invalida el
      filtro contable por empresa aunque el total general coincida.
      Corregido en `TurnoRepository.sumarizarPorColaboradorYDia/YTienda`
      (agrupan y unen por `empresa_id` del turno, no del colaborador) y
      `ReporteService.getPreliquidacionMensual` (agrupa por
      colaborador+empresa histórica — un colaborador que trabajó en dos
      empresas en el mes ahora sale como dos filas). De paso, validación de
      parámetros (mes 1-12, año 2000-2100, umbral > 0) y test dedicado
      (`ReporteServiceTest`, cubre el caso de empresa histórica dividida y
      los parámetros inválidos). `GET /api/reportes/preliquidacion?mes&anio&empresaId&umbralHorasDiarias`
      (`ReporteController`/`ReporteService`, `PreliquidacionMensualDTO`) +
      vista `/reportes/preliquidacion` (diseño propio, ver más abajo) +
      export Excel de 2 hojas (Resumen/Detalle, `ExportExcelComponent`
      ahora soporta `[sheets]` además de `[data]`/`[columns]`). Verificado
      cruzando totales contra `/api/turnos/resumen-mensual` (deben
      coincidir exactamente — mismo cálculo, dos caminos).

- [x] **Fase 4 — Rediseñar análisis de colaborador.** CERRADA 15 ago 2026.
      El rediseño del 14 ago tuvo una vuelta de corrección al día
      siguiente: el criterio original de "semana atípica" (outlier por
      desviación estándar) mezclaba semanas parciales y semanas sin
      actividad sin que exista jornada contractual — se reemplazó por
      "semanas de mayor carga" (top 4 por horas, solo semanas completas con
      actividad, excluyendo la semana en curso), y `getDefaultFechaInicio/
      Fin` tenía un corrimiento de un día por convertir a UTC (`toISOString`)
      — ahora usa `formatearFechaLocal`. La lógica de cálculo se extrajo a
      `colaborador-analytics.util.ts` (funciones puras, sin Angular, con su
      propio `.spec.ts`) en vez de vivir toda en el componente.
      `colaborador-profile` quedó como ficha analítica: header con
      identidad + filtro de rango + manejo de error de rango inválido, tira
      de stats (horas del período, promedio de semanas completas con
      actividad, horas en feriado, días con excepciones), composición
      normal/feriado, semanas de mayor carga, distribución por tienda
      (barras CSS, no Chart.js), "Excepciones del período" (turno partido /
      horas extra candidatas por día, acotada a este colaborador) y
      actividad reciente. Soporta deep-link por query params
      (`desde`/`hasta`/`empresaId`/`umbralHorasDiarias`) — el listado de
      preliquidación linkea con esos params, así que la ficha muestra
      "Empresa del período" (la de ese contexto, filtrando los turnos por
      `empresaId`) en vez de la empresa actual del colaborador, relevante
      si cambió de empresa — esto fue lo que expuso el bug de Fase 3 de
      arriba. Se evaluó mover cálculos a backend como en Fase 2 y se
      decidió que no: acá es un solo colaborador (no todos los de una
      empresa), y los datos ya llegan correctos desde
      `Turno.getHorasTrabajadas()` sin la duplicación SQL que sí se
      justifica en preliquidación por volumen — todo sigue en Angular. Sí
      se corrigió una llamada HTTP redundante (`getTurnosFeriados` traía de
      nuevo lo que ya venía en `getHorasTrabajadas`; ahora se filtra
      client-side por `esFeriado`). Efecto colateral: `colaborador-profile`
      era el único consumidor de
      `chart.js`/`ng2-charts`/`ngx-countup`/`chartjs-plugin-datalabels` y de
      `utils/chart-config.util.ts` — se borraron del `package.json` y el
      util, ya sin uso.

      Checkpoint de cierre de ambas fases (15 ago): suite backend completa
      con JDK 17 (`mvn test`, 3 tests), build Angular de producción y los 6
      tests focalizados de la ficha de colaborador, todos correctos. La API
      levantada contra la BD y una consulta SQL independiente confirmaron
      para junio de 2026 el mismo total general (2418.5 h) y su reparto por
      empresa histórica (694 h + 1724.5 h); también se verificó el rechazo
      de un mes inválido. La revisión manual de navegación y presentación
      fue aprobada por el usuario. La suite frontend completa todavía tiene
      17 pruebas heredadas con configuración deficiente de TestBed; se deja
      como deuda explícita y no se presenta como validación superada.

- [ ] **Fase 5 — Excepciones y calidad de datos.** EN DEFINICIÓN (auditoría
      de BD realizada el 15 ago 2026). El primer corte propone estas reglas:
      horario incompleto o inválido, solapamiento, turno exacto duplicado,
      marca de feriado inconsistente, turno futuro de un colaborador,
      posible falta de descanso semanal, jornada extensa, turno partido y
      programación fuera del horizonte. La revisión posterior al primer corte
      obliga a separar dos
      señales que no son equivalentes: más de 8 h diarias o 48 h semanales es
      un **riesgo de cumplimiento laboral por conciliar** con asistencia,
      régimen de jornada, voluntariedad y pago/compensación del sobretiempo;
      más de 12 h es además una **anomalía operativa extrema**. El primer
      indicador no se puede descartar por ser frecuente: precisamente hay
      3971 jornadas programadas por encima de 8 h y 303 semanas completas por
      encima de 48 h. No existe en la regla general un tope independiente de
      220 h mensuales: en una muestra de los siete meses completos de 2026,
      solo 2 de 103 casos persona-mes superan 220 h, pero 56 contienen al menos
      una semana superior a 48 h; 54 de esos 56 quedan por debajo de 220 h.
      Por ello, un control mensual ocultaría casi todos los casos relevantes.
      Tampoco permite declarar por sí solo una infracción,
      porque `Turno` registra programación, no asistencia real ni pago de
      horas extra, y una semana calendario puede no coincidir con el ciclo de
      una jornada atípica. "Turno sin puesto histórico" queda fuera: `Turno`
      no almacena puesto y el puesto actual del colaborador no permite
      reconstruir el pasado con rigor. Empresa y tienda ya son obligatorias
      por esquema y claves foráneas, pero se conservarán como controles
      defensivos en la consulta.

      Línea base de 6157 turnos (2025-02-01 a 2026-09-10): 0 horarios
      incompletos/inválidos, 0 solapamientos, 0 duplicados exactos, 0
      inconsistencias de feriado, 0 turnos futuros de deshabilitados y 0
      turnos a más de 90 días; sí existen 50 días con turno partido, 7
      jornadas por encima de 12 h y 303 semanas completas por encima de 48 h
      (máximo programado: 79.75 h). Entre enero y julio de 2026 aparecen 35
      secuencias programadas, correspondientes a 16 personas, sin una brecha
      de 24 h consecutivas entre turnos; la mayor abarca 20 días trabajados.
      Es una señal de posible falta de descanso semanal, no una conclusión
      sobre asistencia real. Hay 27 colaboradores deshabilitados; 23
      tienen historial de turnos válido. Ese historial no se marcará como
      error, porque no existe fecha de baja en el modelo. Propuesta de
      severidad pendiente de aprobación: errores para
      integridad/solapamiento/duplicado/feriado; riesgo laboral alto —no
      veredicto automático— para límites diarios/semanales y ausencia aparente
      de descanso semanal; advertencias para deshabilitado futuro, jornada
      extrema y horizonte; información para turno partido.

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
  ├── Preliquidación mensual   (Fase 3 — lista)
  ├── Colaboradores            (Fase 4 — lista)
  ├── Cobertura por tienda     (sin fase asignada)
  └── Excepciones              (Fase 5)
  ```
  "Turnos en feriados" pasa a ser un desglose/filtro de preliquidación.
  "Horas trabajadas" queda como el detalle de turnos programados
  (drill-down). "Semana normal" no es un reporte — pertenece al módulo de
  Turnos, no a esta sección.

## Próximo paso sugerido

Conciliar con contabilidad/asesoría laboral una muestra de las jornadas de
más de 8 h y semanas de más de 48 h contra asistencia, boletas, acuerdos y
descansos. Después aprobar las reglas y severidades de la Fase 5 e implementar
primero la consulta y sus pruebas; la pantalla se diseña con resultados reales.

## Protocolo obligatorio de avance y revisión

Esta sección aplica a cualquier agente que continúe el trabajo, incluido
Claude. Compilar no equivale a cerrar una fase. Antes de marcar una fase como
`[x]` hay que demostrar que sus cifras, semántica y navegación son correctas.

1. Trabajar una unidad coherente y mantener actualizado este roadmap.
2. Detenerse en un **checkpoint de revisión** cuando cambie una regla de
   negocio, una agregación contable, el esquema/migración, la navegación entre
   reportes o una pantalla que necesite evaluación visual.
3. En cada checkpoint indicar al usuario:
   - rutas y pantallas exactas que debe revisar;
   - casos concretos y resultado esperado;
   - verificaciones automáticas ejecutadas y sus limitaciones;
   - archivos modificados y riesgos pendientes;
   - comandos de stage y un mensaje de commit descriptivo.
4. No ejecutar `git commit` salvo pedido explícito. El formato de entrega es:
   ```bash
   git add .
   git commit -m "tipo(alcance): resumen" -m "Contexto y comportamiento corregido..." -m "Verificación realizada..."
   ```
5. Si la revisión revela una inconsistencia, reabrir la fase en este documento;
   no minimizarla porque la aplicación compile o el total general coincida.
6. Para reportes contables validar siempre al menos:
   - total general;
   - distribución por empresa histórica;
   - detalle que explica cada agregado;
   - feriados y turnos partidos;
   - filtros vacíos y períodos sin datos.
7. Para análisis de colaborador validar desktop, mobile, rango inválido, rango
   sin turnos, turno partido real, feriado y cambios rápidos de filtro.

## Cómo se actualiza este documento

Al cerrar una fase: mover su casillero a `[x]`, anotar la fecha y qué se
entregó (endpoint/vista/archivos clave — no el detalle línea por línea, eso
vive en el código y en `git log`), y actualizar "Próximo paso sugerido".
Si una decisión de diseño cambia, corregir la sección de decisiones en vez
de dejar dos versiones contradictorias.
