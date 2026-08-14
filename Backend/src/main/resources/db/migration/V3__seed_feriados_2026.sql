-- Backfill de feriados 2026: el seed original de FeriadoService (@PostConstruct)
-- solo carga datos si la tabla está completamente vacía, así que agregar 2026
-- a esa lista en código nunca iba a llegar a una base ya existente (dev local
-- o prod) — solo sirve para una base nueva desde cero. Esta migración sí corre
-- en toda base existente (V1 es la única "baseline" especial). ON CONFLICT
-- por si alguna fila ya fue cargada a mano antes de este deploy.
INSERT INTO feriado (fecha, descripcion) VALUES
    ('2026-01-01', 'Año Nuevo'),
    ('2026-04-02', 'Jueves Santo'),
    ('2026-04-03', 'Viernes Santo'),
    ('2026-05-01', 'Día del Trabajo'),
    ('2026-06-07', 'Batalla de Arica y Día de la Bandera'),
    ('2026-06-29', 'Día de San Pedro y San Pablo'),
    ('2026-07-23', 'Día de la Fuerza Aérea del Perú'),
    ('2026-07-28', 'Fiestas Patrias'),
    ('2026-07-29', 'Fiestas Patrias'),
    ('2026-08-06', 'Batalla de Junín'),
    ('2026-08-30', 'Santa Rosa de Lima'),
    ('2026-10-08', 'Combate de Angamos'),
    ('2026-11-01', 'Día de Todos los Santos'),
    ('2026-12-08', 'Inmaculada Concepción'),
    ('2026-12-09', 'Batalla de Ayacucho'),
    ('2026-12-25', 'Navidad')
ON CONFLICT (fecha) DO NOTHING;
