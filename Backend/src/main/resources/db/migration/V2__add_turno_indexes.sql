-- Turno es la tabla de mayor volumen y no tenía ningún índice propio (a
-- diferencia de colaborador). Estos nombres coinciden con los @Index
-- declarados en model/Turno.java.
CREATE INDEX idx_turno_fecha ON turno USING btree (fecha);
CREATE INDEX idx_turno_colaborador_id ON turno USING btree (colaborador_id);
CREATE INDEX idx_turno_tienda_id ON turno USING btree (tienda_id);
