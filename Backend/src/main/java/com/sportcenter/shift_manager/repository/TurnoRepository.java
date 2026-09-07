package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Turno;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

// TurnoDiarioAgregado / TurnoTiendaAgregado: proyecciones de las queries de
// reportes definidas más abajo, en el mismo paquete (repository/).

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {

    // @EntityGraph en los finders usados para listar/convertir a DTO: trae
    // colaborador, empresa y tienda en una sola query (JOIN) en vez de que
    // Hibernate dispare una consulta lazy por cada relación y por cada turno
    // (N+1). Antes esto "funcionaba" solo porque open-in-view mantenía la
    // sesión abierta durante toda la request; con open-in-view=false, sin esto,
    // TurnoService.convertToDTO lanzaría LazyInitializationException.
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_Id(Long colaboradorId);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByFechaBetween(LocalDate startDate, LocalDate endDate);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByFechaIsNull();

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByEmpresa_IdAndFechaBetween(Long empresaId, LocalDate startDate, LocalDate endDate);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByEmpresa_IdAndFechaIsNull(Long empresaId);

    // Variante paginada, usada en el listado mensual (GET /api/turnos/mensual)
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    Page<Turno> findByFechaBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    // Buscar turnos de un colaborador por rango de fechas
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_IdAndFechaBetween(Long colaboradorId, LocalDate startDate, LocalDate endDate);

    // Turnos del mismo colaborador el mismo día — usado por
    // TurnoService.aplicarDatosTurno para validar que un turno partido (o
    // cualquier alta/edición) no se solape con otro bloque horario ya
    // existente ese día.
    List<Turno> findByColaborador_IdAndFecha(Long colaboradorId, LocalDate fecha);

    // Método para buscar turnos por tienda y rango de fechas, ordenados por fecha
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByTienda_IdAndFechaBetweenOrderByFechaAsc(
            Long tiendaId,
            LocalDate fechaInicio,
            LocalDate fechaFin);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_IdInAndFechaBetween(List<Long> colaboradores, LocalDate inicio, LocalDate fin);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_IdInAndEmpresa_IdAndFechaBetween(
            List<Long> colaboradores,
            Long empresaId,
            LocalDate inicio,
            LocalDate fin);

    // es_feriado se persiste en el turno (no se recalcula al leer, ver
    // TurnoService.aplicarDatosTurno), así que cuando se crea/edita/borra un
    // feriado hay que reflejarlo a mano en los turnos ya existentes de esa
    // fecha. Ver FeriadoService.crearFeriado/actualizarFeriado/eliminarFeriado.
    //
    // flushAutomatically=true es imprescindible acá: eliminarFeriado y
    // actualizarFeriado dejan un delete()/save() pendiente en el
    // contexto de persistencia (Hibernate lo difiere hasta el commit).
    // Un @Modifying query se ejecuta como SQL directo saltándose ese
    // contexto, y clearAutomatically=true lo limpia después — sin el
    // flush previo, ese clear() descarta el delete/update pendiente
    // ANTES de que llegue a convertirse en SQL, así que el feriado
    // nunca se borraba/actualizaba en la BD aunque el endpoint devolvía
    // 204/200 sin error. Confirmado con un DELETE real: sin flushAutomatically
    // no aparece ningún "delete from feriado" en el log de Hibernate.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Turno t SET t.esFeriado = :esFeriado WHERE t.fecha = :fecha")
    int updateEsFeriadoByFecha(@Param("fecha") LocalDate fecha, @Param("esFeriado") boolean esFeriado);

    // ------------------- REPORTES: agregados en BD -------------------
    //
    // Antes de esto, todo reporte (getResumenMensualPorColaboradores,
    // calcularHorasPorColaborador, etc. en TurnoService) traía la lista
    // completa de Turno del período y sumaba con streams en Java. Funciona
    // con el volumen actual, pero no escala y obliga a repetir el mismo
    // patrón caro en cada reporte nuevo. Estas dos queries dejan que
    // Postgres agrupe y sume.
    //
    // Van en SQL nativo, no JPQL: la resta de horaEntrada/horaSalida
    // (columnas `time`) más el descuento condicional de almuerzo no tienen
    // una traducción JPQL limpia, y el proyecto usa un único motor
    // (Postgres) tanto en dev como en prod, así que la portabilidad entre
    // motores no es un costo real a evitar acá.
    //
    // El descuento de almuerzo (45 min) ahora lee la columna persistida
    // t.tomo_almuerzo directamente (ver Turno.java y V8__add_turno_
    // tomo_almuerzo.sql) — ya no repite la regla de horario a mano, así que
    // este total queda automáticamente en sync con Turno.getHorasTrabajadas()
    // y con el override manual del administrador.

    /**
     * Una fila por (colaboradorId, empresa histórica, fecha) dentro del rango,
     * con la cantidad de turnos ese día (para detectar "turno partido": más
     * de 1 fila el mismo día), los minutos netos ya descontando almuerzo, y si
     * ese día fue feriado.
     */
    @Query(value = """
            SELECT t.colaborador_id AS colaboradorId,
                   t.empresa_id AS empresaId,
                   e.nombre AS nombreEmpresa,
                   t.fecha AS fecha,
                   COUNT(*) AS cantidadTurnos,
                   SUM(
                       CASE WHEN t.tomo_almuerzo
                            THEN EXTRACT(EPOCH FROM (t.hora_salida - t.hora_entrada)) / 60 - 45
                            ELSE EXTRACT(EPOCH FROM (t.hora_salida - t.hora_entrada)) / 60
                       END
                   ) AS minutosNetos,
                   bool_or(t.es_feriado) AS esFeriado
            FROM turno t
            JOIN empresa e ON e.id = t.empresa_id
            WHERE t.fecha BETWEEN :inicio AND :fin
              AND (:empresaId IS NULL OR t.empresa_id = :empresaId)
            GROUP BY t.colaborador_id, t.empresa_id, e.nombre, t.fecha
            """, nativeQuery = true)
    List<TurnoDiarioAgregado> sumarizarPorColaboradorYDia(
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin,
            @Param("empresaId") Long empresaId);

    /**
     * Una fila por (colaboradorId, empresa histórica, tiendaId) dentro del
     * rango, con el total de horas netas programadas en esa tienda (mismo
     * descuento de almuerzo que la query anterior).
     */
    @Query(value = """
            SELECT t.colaborador_id AS colaboradorId,
                   t.empresa_id AS empresaId,
                   t.tienda_id AS tiendaId,
                   tda.nombre AS nombreTienda,
                   SUM(
                       CASE WHEN t.tomo_almuerzo
                            THEN EXTRACT(EPOCH FROM (t.hora_salida - t.hora_entrada)) / 60 - 45
                            ELSE EXTRACT(EPOCH FROM (t.hora_salida - t.hora_entrada)) / 60
                       END
                   ) / 60.0 AS horas
            FROM turno t
            JOIN tienda tda ON tda.id = t.tienda_id
            WHERE t.fecha BETWEEN :inicio AND :fin
              AND (:empresaId IS NULL OR t.empresa_id = :empresaId)
            GROUP BY t.colaborador_id, t.empresa_id, t.tienda_id, tda.nombre
            """, nativeQuery = true)
    List<TurnoTiendaAgregado> sumarizarPorColaboradorYTienda(
            @Param("inicio") LocalDate inicio,
            @Param("fin") LocalDate fin,
            @Param("empresaId") Long empresaId);
}
