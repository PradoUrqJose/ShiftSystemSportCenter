-- turno.es_feriado se calcula una sola vez al crear/editar el turno
-- (TurnoService.aplicarDatosTurno) comparando la fecha contra la tabla
-- feriado en ese instante. Si el feriado se carga después (como pasó con
-- 2026: V3 llegó bastante después de que ya hubiera turnos de enero-agosto
-- cargados), esos turnos quedan con es_feriado=false para siempre — nada
-- los recalcula solo. Confirmado en dev: 83 turnos de 2026 con este
-- desfase (658.65 h mal contadas en el resumen mensual/planilla).
--
-- Esta migración sincroniza el estado actual una vez. El desfase hacia
-- adelante ya no debería repetirse: FeriadoService ahora actualiza
-- turno.es_feriado en bloque al crear/editar/eliminar un feriado
-- (ver crearFeriado/actualizarFeriado/eliminarFeriado).
--
-- Se corrige en ambas direcciones por si alguna vez se borra o mueve de
-- fecha un feriado con turnos ya marcados en la fecha vieja.
UPDATE turno t
SET es_feriado = true
WHERE es_feriado = false
  AND EXISTS (SELECT 1 FROM feriado f WHERE f.fecha = t.fecha);

UPDATE turno t
SET es_feriado = false
WHERE es_feriado = true
  AND NOT EXISTS (SELECT 1 FROM feriado f WHERE f.fecha = t.fecha);
