-- Antes "tomó almuerzo" se calculaba en cada consulta a partir del horario
-- (entrada < 12:01 AND salida > 14:00), tanto en Turno.isTomoAlmuerzo() como
-- duplicado a mano en TurnoRepository.sumarizarPorColaboradorYDia/YTienda.
-- Ahora se persiste, para que el administrador pueda desactivar el
-- descuento de almuerzo a mano en turnos donde no aplica (ver Turno.java).
--
-- Backfill: se aplica la misma regla que usaba el cálculo automático, para
-- que los datos históricos no cambien de valor con esta migración.
ALTER TABLE turno ADD COLUMN tomo_almuerzo boolean NOT NULL DEFAULT false;

UPDATE turno
SET tomo_almuerzo = true
WHERE hora_entrada < TIME '12:01:00'
  AND hora_salida > TIME '14:00:00';
