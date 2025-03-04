package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Tienda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TiendaRepository extends JpaRepository<Tienda, Long> {
    Optional<Tienda> findByNombre(String nombre); // Opcional, para validar duplicados
}