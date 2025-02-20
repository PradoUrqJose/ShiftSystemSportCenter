package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Turno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {
    List<Turno> findByColaborador_Id(Long colaboradorId);
    List<Turno> findByFechaBetween(LocalDate startDate, LocalDate endDate);

    // Buscar turnos de un colaborador por rango de fechas
    List<Turno> findByColaborador_IdAndFechaBetween(Long colaboradorId, LocalDate startDate, LocalDate endDate);
    // Método para buscar turnos por tienda y rango de fechas, ordenados por fecha
    List<Turno> findByTienda_IdAndFechaBetweenOrderByFechaAsc(
            Long tiendaId,
            LocalDate fechaInicio,
            LocalDate fechaFin);
    List<Turno> findByColaborador_IdInAndFechaBetween(List<Long> colaboradores, LocalDate inicio, LocalDate fin);
}
