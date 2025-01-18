package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ColaboradorService {
    private final ColaboradorRepository colaboradorRepository;
    private final EmpresaRepository empresaRepository;

    public ColaboradorService(ColaboradorRepository colaboradorRepository, EmpresaRepository empresaRepository) {
        this.colaboradorRepository = colaboradorRepository;
        this.empresaRepository = empresaRepository;
    }

    // Guardar un nuevo colaborador
    public Colaborador saveColaborador(ColaboradorDTO colaboradorDTO) {
        Empresa empresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        Colaborador colaborador = new Colaborador();
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setEmpresa(empresa);

        return colaboradorRepository.save(colaborador);
    }

    // Obtener todos los colaboradores
    public List<ColaboradorDTO> getAllColaboradores() {
        return colaboradorRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Obtener colaboradores por empresa
    public List<ColaboradorDTO> getColaboradoresByEmpresa(Long empresaId) {
        return colaboradorRepository.findByEmpresaId(empresaId).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Actualizar un colaborador
    public Colaborador updateColaborador(Long id, ColaboradorDTO colaboradorDTO) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        Empresa nuevaEmpresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        // Cambiar empresa asociada
        colaborador.setEmpresa(nuevaEmpresa);
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setDni(colaboradorDTO.getDni());

        return colaboradorRepository.save(colaborador);
    }

    // Eliminar un colaborador
    public void deleteColaborador(Long id) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        // Al eliminar al colaborador, los turnos anteriores no se verán afectados
        colaboradorRepository.delete(colaborador);
    }

    // Convertir Colaborador a ColaboradorDTO
    private ColaboradorDTO convertToDTO(Colaborador colaborador) {
        return new ColaboradorDTO(
                colaborador.getId(),
                colaborador.getNombre(),
                colaborador.getDni(),
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getId() : null,
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getNombre() : "N/A"
        );
    }

}
