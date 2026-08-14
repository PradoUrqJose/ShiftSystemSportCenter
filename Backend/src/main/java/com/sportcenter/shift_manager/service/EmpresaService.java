package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.EmpresaDTO;
import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EmpresaService {
    private static final Logger log = LoggerFactory.getLogger(EmpresaService.class);

    private final EmpresaRepository empresaRepository;
    private final ColaboradorRepository colaboradorRepository;

    public EmpresaService(EmpresaRepository empresaRepository, ColaboradorRepository colaboradorRepository) {
        this.empresaRepository = empresaRepository;
        this.colaboradorRepository = colaboradorRepository;
    }

    // Guardar una nueva empresa
    @Transactional
    public Empresa saveEmpresa(EmpresaDTO empresaDTO) {
        if (empresaRepository.findByNombre(empresaDTO.getNombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el nombre: " + empresaDTO.getNombre());
        }
        if (empresaRepository.findByRuc(empresaDTO.getRuc()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el RUC: " + empresaDTO.getRuc());
        }

        Empresa empresa = new Empresa();
        empresa.setNombre(empresaDTO.getNombre());
        empresa.setRuc(empresaDTO.getRuc());
        empresa.setHabilitada(true); // una empresa nueva siempre arranca habilitada

        Empresa guardada = empresaRepository.save(empresa);
        log.info("Empresa creada: id={}, ruc={}", guardada.getId(), guardada.getRuc());
        return guardada;
    }

    // Obtener todas las empresas, paginado
    public Page<EmpresaDTO> getAllEmpresas(Pageable pageable) {
        return empresaRepository.findAll(pageable).map(this::convertToDTO);
    }

    public int getNumeroDeEmpleados(Long id) {
        if (!empresaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Empresa con ID " + id + " no encontrada");
        }
        return (int) colaboradorRepository.countByEmpresaId(id);
    }

    @Transactional
    public Empresa toggleHabilitacionEmpresa(Long id, boolean habilitada) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa con ID " + id + " no encontrada"));
        empresa.setHabilitada(habilitada);
        log.info("Empresa id={} habilitada={}", id, habilitada);
        return empresaRepository.save(empresa);
    }

    public List<EmpresaDTO> getEmpresasPorHabilitacion(boolean habilitada) {
        return empresaRepository.findByHabilitada(habilitada).stream()
                .map(this::convertToDTO)
                .toList();
    }

    @Transactional
    public Empresa updateEmpresa(Long id, EmpresaDTO empresaDTO) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa con ID " + id + " no encontrada"));

        if (!empresa.getNombre().equals(empresaDTO.getNombre()) &&
                empresaRepository.findByNombre(empresaDTO.getNombre()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el nombre: " + empresaDTO.getNombre());
        }
        if (!empresa.getRuc().equals(empresaDTO.getRuc()) &&
                empresaRepository.findByRuc(empresaDTO.getRuc()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa con el RUC: " + empresaDTO.getRuc());
        }

        empresa.setNombre(empresaDTO.getNombre());
        empresa.setRuc(empresaDTO.getRuc());
        empresa.setHabilitada(empresaDTO.isHabilitada());
        log.info("Empresa actualizada: id={}", id);
        return empresaRepository.save(empresa);
    }

    @Transactional
    public void deleteEmpresa(Long id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa con ID " + id + " no encontrada"));

        List<Colaborador> colaboradores = colaboradorRepository.findByEmpresaId(id);
        for (Colaborador colaborador : colaboradores) {
            colaborador.setEmpresa(null);
            colaboradorRepository.save(colaborador);
        }

        empresaRepository.delete(empresa);
        log.info("Empresa eliminada: id={}", id);
    }

    public EmpresaDTO convertToDTO(Empresa empresa) {
        // countByEmpresaId en vez de empresa.getNumeroDeEmpleados(): ese método
        // recorre la colección LAZY "colaboradores" completa solo para contarla
        // (y con open-in-view=false, tocarla acá afuera de una transacción
        // lanzaría LazyInitializationException). Un COUNT es además más liviano.
        return new EmpresaDTO(
                empresa.getId(),
                empresa.getNombre(),
                empresa.getRuc(),
                (int) colaboradorRepository.countByEmpresaId(empresa.getId()),
                empresa.isHabilitada()
        );
    }
}
