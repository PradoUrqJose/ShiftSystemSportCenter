package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.PuestoDTO;
import com.sportcenter.shift_manager.model.Puesto;
import com.sportcenter.shift_manager.repository.PuestoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PuestoService {
    private final PuestoRepository puestoRepository;

    public PuestoService(PuestoRepository puestoRepository) {
        this.puestoRepository = puestoRepository;
    }

    // Crear un nuevo puesto
    public PuestoDTO savePuesto(PuestoDTO puestoDTO) {
        // Validar duplicados por nombre
        puestoRepository.findByNombre(puestoDTO.getNombre())
                .ifPresent(p -> {
                    throw new IllegalArgumentException("Ya existe un puesto con el nombre: " + puestoDTO.getNombre());
                });

        Puesto puesto = new Puesto();
        puesto.setNombre(puestoDTO.getNombre());
        puesto.setDescripcion(puestoDTO.getDescripcion());

        Puesto savedPuesto = puestoRepository.save(puesto);
        return convertToDTO(savedPuesto);
    }

    // Obtener todos los puestos
    public List<PuestoDTO> getAllPuestos() {
        return puestoRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Obtener un puesto por ID
    public PuestoDTO getPuestoById(Long id) {
        Puesto puesto = puestoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Puesto con ID " + id + " no encontrado"));
        return convertToDTO(puesto);
    }

    // Actualizar un puesto
    public PuestoDTO updatePuesto(Long id, PuestoDTO puestoDTO) {
        Puesto puesto = puestoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Puesto con ID " + id + " no encontrado"));

        // Validar duplicados por nombre (excepto el propio puesto)
        puestoRepository.findByNombre(puestoDTO.getNombre())
                .filter(p -> !p.getId().equals(id))
                .ifPresent(p -> {
                    throw new IllegalArgumentException("Ya existe un puesto con el nombre: " + puestoDTO.getNombre());
                });

        puesto.setNombre(puestoDTO.getNombre());
        puesto.setDescripcion(puestoDTO.getDescripcion());

        Puesto updatedPuesto = puestoRepository.save(puesto);
        return convertToDTO(updatedPuesto);
    }

    // Eliminar un puesto
    public void deletePuesto(Long id) {
        Puesto puesto = puestoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Puesto con ID " + id + " no encontrado"));
        puestoRepository.delete(puesto);
    }

    // Convertir Puesto a PuestoDTO
    private PuestoDTO convertToDTO(Puesto puesto) {
        return new PuestoDTO(
                puesto.getId(),
                puesto.getNombre(),
                puesto.getDescripcion()
        );
    }
}