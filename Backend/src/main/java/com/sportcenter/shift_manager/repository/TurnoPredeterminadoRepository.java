package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.TurnoPredeterminado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TurnoPredeterminadoRepository extends JpaRepository<TurnoPredeterminado, Long> {
    // Orden estable para que los botones no salten de lugar entre cargas.
    List<TurnoPredeterminado> findAllByOrderByHoraEntradaAscHoraSalidaAsc();
}
