package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Feriado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeriadoRepository extends JpaRepository<Feriado, Long> {
    boolean existsByFecha(LocalDate fecha);
    Optional<Feriado> findByFecha(LocalDate fecha);
    List<Feriado> findByFechaBetween(LocalDate inicio, LocalDate fin);
}
