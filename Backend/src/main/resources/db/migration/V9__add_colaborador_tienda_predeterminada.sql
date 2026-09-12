-- Tienda habitual de un colaborador: el modal de turno la precarga al crear
-- un turno nuevo, pero el operador la puede cambiar en cada turno. Es solo
-- un valor por defecto de UI — la tienda real de cada turno sigue viviendo
-- en turno.tienda_id.
--
-- ON DELETE SET NULL: borrar una tienda no debe quedar bloqueado porque
-- algún colaborador la tenía como predeterminada; simplemente se le limpia.
ALTER TABLE colaborador ADD COLUMN tienda_predeterminada_id bigint;

ALTER TABLE colaborador
    ADD CONSTRAINT fk_colaborador_tienda_predeterminada
    FOREIGN KEY (tienda_predeterminada_id) REFERENCES tienda (id) ON DELETE SET NULL;
