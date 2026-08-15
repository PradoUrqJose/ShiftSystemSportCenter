-- Índice compuesto para las queries agregadas de reportes
-- (TurnoRepository.sumarizarPorColaboradorYDia/YTienda), que filtran por
-- rango de fecha y agrupan por colaborador. Nombre coincide con el
-- @Index declarado en model/Turno.java.
CREATE INDEX idx_turno_colaborador_fecha ON turno USING btree (colaborador_id, fecha);
