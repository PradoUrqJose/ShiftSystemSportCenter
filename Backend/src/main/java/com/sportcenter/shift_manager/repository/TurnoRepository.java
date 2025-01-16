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
}
