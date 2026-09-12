package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Colaborador;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ColaboradorRepository extends JpaRepository<Colaborador, Long> {

    // @EntityGraph trae empresa, puesto y tienda predeterminada en la misma query (ahora que Colaborador.empresa/puesto
    // son LAZY). Se redeclaran los métodos heredados de JpaRepository para poder anotarlos.
    @EntityGraph(attributePaths = {"empresa", "puesto", "tiendaPredeterminada"})
    Optional<Colaborador> findById(Long id);

    @EntityGraph(attributePaths = {"empresa", "puesto", "tiendaPredeterminada"})
    Page<Colaborador> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"empresa", "puesto", "tiendaPredeterminada"})
    List<Colaborador> findByEmpresaId(Long empresaId);

    @EntityGraph(attributePaths = {"empresa", "puesto", "tiendaPredeterminada"})
    List<Colaborador> findByHabilitado(boolean habilitado);

    // Redeclarado por el mismo motivo que los de arriba: ReporteService lo usa
    // para resolver en una sola query los colaboradores con actividad en un
    // período (nombre, dni, empresa, puesto), sin heredar el default de
    // JpaRepository que dispara un lazy load por relación y por colaborador.
    @EntityGraph(attributePaths = {"empresa", "puesto", "tiendaPredeterminada"})
    List<Colaborador> findAllById(Iterable<Long> ids);

    long countByEmpresaId(Long empresaId);

    Optional<Colaborador> findByEmail(String email);
    Optional<Colaborador> findByDni(String dni);
    Optional<Colaborador> findByNombreAndApellido(String nombre, String apellido);
}
