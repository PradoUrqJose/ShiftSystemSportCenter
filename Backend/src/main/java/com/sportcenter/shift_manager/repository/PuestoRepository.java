package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Puesto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PuestoRepository extends JpaRepository<Puesto, Long> {
    Optional<Puesto> findByNombre(String nombre);
}