package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {
    Optional<Empresa> findByNombre(String nombre);
    Optional<Empresa> findByRuc(String ruc); // Nuevo método para buscar por RUC
    List<Empresa> findByHabilitada(boolean habilitada);
}
