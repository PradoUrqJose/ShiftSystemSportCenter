package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

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
    public List<Colaborador> getAllColaboradores() {
        return colaboradorRepository.findAll();
    }

    // Obtener colaboradores por empresa
    public List<Colaborador> getColaboradoresByEmpresa(Long empresaId) {
        return colaboradorRepository.findByEmpresaId(empresaId);
    }

    // Actualizar un colaborador
    public Colaborador updateColaborador(Long id, ColaboradorDTO colaboradorDTO) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        Empresa empresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setEmpresa(empresa);

        return colaboradorRepository.save(colaborador);
    }

    // Eliminar un colaborador
    public void deleteColaborador(Long id) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        colaboradorRepository.delete(colaborador);
    }
}
