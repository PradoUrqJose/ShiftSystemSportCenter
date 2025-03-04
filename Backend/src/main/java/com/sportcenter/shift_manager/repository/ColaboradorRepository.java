package com.sportcenter.shift_manager.repository;

import com.sportcenter.shift_manager.model.Colaborador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ColaboradorRepository extends JpaRepository<Colaborador, Long> {
    List<Colaborador> findByEmpresaId(Long empresaId);

    List<Colaborador> findByHabilitado(boolean habilitado);
    Optional<Colaborador> findByEmail(String email);
    Optional<Colaborador> findByDni(String dni);
    Optional<Colaborador> findByNombreAndApellido(String nombre, String apellido);
}
