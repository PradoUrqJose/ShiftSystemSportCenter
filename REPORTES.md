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
| Exportación contable | Entregar resumen y detalle decimal auditable en un único Excel | Muy alta |
| Detalle de turnos | Auditar el origen de cualquier total exportado | Necesario, como segunda hoja del Excel contable |

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
      Los reportes heredados de `TurnoService` siguieron sumando en Java en
      ese checkpoint; su consolidación se hizo posteriormente, reporte por
      reporte, sin reescribir de una vez todos los consumidores.

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
      fue aprobada por el usuario. La suite frontend completa continúa como
      deuda explícita y no se presenta como validación superada. En la última
      medición (15 ago) pasan 16 de 31 pruebas y fallan 15 por configuración
      heredada de TestBed (`HttpClient` ausente o componentes standalone
      declarados como módulos), no por las pruebas focalizadas de Reportes.

- [x] **Fase 5 — Excepciones y calidad de datos.** CERRADA 15 ago 2026,
      incluida la revisión manual de presentación y navegación.
      `GET /api/reportes/excepciones?desde&hasta&empresaId&umbralHorasDiarias&umbralJornadaExtrema&horizonteDias`
      devuelve hallazgos auditables con severidad, período, colaborador,
      empresa histórica y los IDs de los turnos involucrados. La vista
      `/reportes/excepciones` incorpora rango/empresa, criterios avanzados,
      resumen por severidad, filtros locales, exportación y acceso a la ficha
      del colaborador. El primer corte aplica estas reglas:
      horario incompleto o inválido, solapamiento, turno exacto duplicado,
      marca de feriado inconsistente, turno futuro de un colaborador
      deshabilitado,
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
      error, porque no existe fecha de baja en el modelo. Severidad
      implementada: errores para
      integridad/solapamiento/duplicado/feriado; riesgo laboral alto —no
      veredicto automático— para límites diarios/semanales y ausencia aparente
      de descanso semanal; advertencias para deshabilitado futuro, jornada
      extrema y horizonte; información para turno partido.

      La implementación se verificó contra julio de 2026: API y SQL
      independiente coinciden en 283 jornadas sobre 8 h, 13 semanas completas
      que tocan el período sobre 48 h y 3 turnos partidos. La API agrega 12
      señales de posible falta de descanso de 24 h, para un total de 311
      hallazgos (308 riesgos, 3 informativos, 0 errores). El filtro por empresa
      conserva únicamente la empresa histórica solicitada y un rango invertido
      responde HTTP 400. La revisión manual de desktop/mobile, filtros,
      exportación y navegación a la ficha fue aprobada por el usuario; el
      navegador automatizado no estuvo disponible en esta sesión.

      Checkpoint visual adicional aprobado el 15 ago: se eliminó de Reportes
      el patrón de bordes de acento (línea superior en indicadores, línea
      lateral en hallazgos y barra deslizante del navbar). La selección y las
      severidades ahora se expresan con superficies suaves, chips y puntos de
      estado. También se reorganizó `/reportes/colaborador-profile/:id` con
      una jerarquía de identidad, período, resumen y bloques analíticos. No se
      modificaron reglas ni datos. El build de producción y 8 pruebas
      focalizadas de excepciones/ficha/utilidades finalizaron correctamente;
      la revisión visual final fue aprobada por el usuario.

- [x] **Fase 6 — Portada-resumen compacta.** CERRADA 15 ago 2026. El endpoint
      `GET /api/reportes/resumen?desde&hasta&empresaId` compone los agregados
      diarios/por tienda ya validados con el motor de excepciones; no duplica
      consultas de horas ni reglas de calidad. La vista `/reportes/resumen`
      trabaja por mes y empresa histórica, muestra horas programadas y en
      feriado, colaboradores con carga excepcional, errores de datos,
      tendencia semanal, distribución por tienda y seis pendientes
      prioritarios. Cada indicador abre preliquidación o excepciones con el
      mismo período/filtro, y cada pendiente permite abrir la ficha del
      colaborador. `/reportes` ahora redirige al resumen y el navbar lo ubica
      primero.

      Verificación previa al checkpoint: 11 pruebas backend correctas con JDK
      17, build Angular de producción correcto y 10 pruebas frontend
      focalizadas correctas. Contra la BD, julio de 2026 coincide exactamente
      con los reportes fuente: 3981.15 h totales, 356.65 h en feriado, 0
      errores y 308 riesgos/advertencias. El filtro de empresa 6 también
      coincide con preliquidación (845 h) y un rango invertido responde 400.
      La presentación, el responsive y la navegación entre resumen,
      preliquidación, excepciones y ficha de colaborador fueron aprobados
      manualmente por el usuario.

- [ ] **Consolidación contable y navegación.** EN CHECKPOINT 15 ago 2026.
      `GET /api/reportes/programacion-contable?desde&hasta&empresaId&colaboradores&umbralHorasDiarias`
      entrega una fuente única para contabilidad por período libre: resumen
      por trabajador y empresa histórica más el detalle de cada turno. La
      nueva vista `/reportes/exportacion-contable` genera un Excel de dos
      hojas con horas como números decimales, columnas de feriado, descuento
      de almuerzo y turno partido, filtros, cabecera inmovilizada y autofiltro.
      Los reportes heredados `horas-trabajadas` y `turnos-feriados`, junto con
      su toolbar y servicio compartidos ya sin consumidores, fueron retirados;
      sus URLs redirigen a la exportación unificada para no romper favoritos.

      Contra la BD, julio de 2026 devuelve 23 personas, 512 turnos, 3981.15 h
      programadas y 356.65 h en feriado; resumen, detalle y preliquidación
      coinciden exactamente. También se verificaron el filtro combinado por
      empresa histórica y trabajador y el rechazo de un rango invertido. Las
      suites focalizadas y el build de producción están correctos. Falta la
      revisión manual del archivo descargado y del responsive antes de cerrar
      este punto.

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
- **"Horas extra candidatas"**: señal aproximada, no cálculo legal. La
  preliquidación usa un umbral diario configurable (8 h por defecto); el
  reporte de excepciones agrega la señal semanal de 48 h y descanso aparente,
  siempre como casos por conciliar, no como infracciones confirmadas.
- **"Turnos partidos"**: se infiere de más de un `Turno` el mismo día para
  el mismo colaborador. No hay relación "turno partido" explícita en el
  modelo (deuda ya documentada como fuera de alcance en el plan de
  mantenibilidad previo).
- **Diseño visual de los reportes nuevos: herramienta operativa sobria.** No
  replicar la composición de los reportes tabulares heredados (toolbar
  elevado + `<table>`) ni usar bordes superiores/laterales de color como
  recurso de estado o selección. La jerarquía se construye con tipografía,
  espaciado y superficies; el color queda restringido a chips, puntos de
  estado, iconos y fondos suaves. Sí usar los tokens del design system
  (`tokens.css`, `DESIGN.md`) y los átomos genéricos (`app-button`,
  `app-badge`, `app-empty-state`, `app-skeleton`) donde encajen. Criterio
  aprobado por el usuario el 15 ago 2026 y aplicable a la Fase 6.
- **Estructura de navegación objetivo** (migración gradual, no de una):
  ```
  Reportes
  ├── Resumen                  (Fase 6)
  ├── Preliquidación mensual   (Fase 3 — lista)
  ├── Exportación contable     (en checkpoint)
  ├── Colaboradores            (Fase 4 — lista)
  ├── Cobertura por tienda     (sin fase asignada)
  └── Excepciones              (Fase 5 — lista)
  ```
  "Turnos en feriados" y "Horas trabajadas" quedan unificados en la
  exportación contable: el feriado es una columna del detalle y no un archivo
  separado. "Semana normal" no es un reporte — pertenece al módulo de Turnos,
  no a esta sección.

## Próximo paso sugerido

Cerrar la revisión manual de `/reportes/exportacion-contable` y del `.xlsx`.
Después, completar la preparación para despliegue: resolver las vulnerabilidades
altas de Angular mediante una migración controlada (sin `npm audit fix --force`),
sanear y documentar la configuración de producción, ensayar migraciones y
respaldo de la BD, agregar una señal de salud para el hosting y estabilizar la
suite frontend completa. Finalmente, mover "Semana normal" al módulo de Turnos.

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
