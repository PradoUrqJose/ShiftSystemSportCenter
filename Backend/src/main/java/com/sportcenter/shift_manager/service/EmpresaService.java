package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.EmpresaDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EmpresaService {
    private final EmpresaRepository empresaRepository;
    private final ColaboradorRepository colaboradorRepository;

    public EmpresaService(EmpresaRepository empresaRepository, ColaboradorRepository colaboradorRepository) {
        this.empresaRepository = empresaRepository;
        this.colaboradorRepository = colaboradorRepository;
    }

    // Guardar una nueva empresa
    public Empresa saveEmpresa(Empresa empresa) {
        if (empresaRepository.findByNombre(empresa.getNombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el nombre: " + empresa.getNombre());
        }
        if (empresaRepository.findByRuc(empresa.getRuc()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el RUC: " + empresa.getRuc());
        }
        return empresaRepository.save(empresa);
    }

    // Obtener todas las empresas
    public List<EmpresaDTO> getAllEmpresas() {
        return empresaRepository.findAll().stream()
                .map(empresa -> new EmpresaDTO(
                        empresa.getId(),
                        empresa.getNombre(),
                        empresa.getRuc(),
                        empresa.getNumeroDeEmpleados() // Método calculado en la entidad
                ))
                .toList();
    }


    // Obtener una empresa por ID
    public Optional<Empresa> getEmpresaById(Long id) {
        return empresaRepository.findById(id);
    }

    // Actualizar una empresa
    public Empresa updateEmpresa(Long id, Empresa empresaDetails) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empresa con ID " + id + " no encontrada"));

        if (!empresa.getNombre().equals(empresaDetails.getNombre()) &&
                empresaRepository.findByNombre(empresaDetails.getNombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el nombre: " + empresaDetails.getNombre());
        }

        if (!empresa.getRuc().equals(empresaDetails.getRuc()) &&
                empresaRepository.findByRuc(empresaDetails.getRuc()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el RUC: " + empresaDetails.getRuc());
        }

        empresa.setNombre(empresaDetails.getNombre());
        empresa.setRuc(empresaDetails.getRuc());
        return empresaRepository.save(empresa);
    }

    // Obtener el número de empleados asociados a una empresa
    public int getNumeroDeEmpleados(Long id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empresa con ID " + id + " no encontrada"));
        return empresa.getNumeroDeEmpleados();
    }

    // Eliminar una empresa
    public void deleteEmpresa(Long id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empresa con ID " + id + " no encontrada"));

        // Usar la instancia inyectada de colaboradorRepository
        List<Colaborador> colaboradores = colaboradorRepository.findByEmpresaId(id);
        for (Colaborador colaborador : colaboradores) {
            colaborador.setEmpresa(null);
            colaboradorRepository.save(colaborador); // Usar la instancia inyectada aquí también
        }

        empresaRepository.delete(empresa);
    }


}
