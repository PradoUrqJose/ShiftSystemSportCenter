package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Turno;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

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

    // Variante paginada, usada en el listado mensual (GET /api/turnos/mensual)
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    Page<Turno> findByFechaBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    // Buscar turnos de un colaborador por rango de fechas
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_IdAndFechaBetween(Long colaboradorId, LocalDate startDate, LocalDate endDate);

    // Método para buscar turnos por tienda y rango de fechas, ordenados por fecha
    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByTienda_IdAndFechaBetweenOrderByFechaAsc(
            Long tiendaId,
            LocalDate fechaInicio,
            LocalDate fechaFin);

    @EntityGraph(attributePaths = {"colaborador", "empresa", "tienda"})
    List<Turno> findByColaborador_IdInAndFechaBetween(List<Long> colaboradores, LocalDate inicio, LocalDate fin);
}
