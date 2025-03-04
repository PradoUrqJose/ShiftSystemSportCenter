package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.repository.TiendaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sportcenter.shift_manager.dto.TiendaDTO;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TiendaService {
    private final TiendaRepository tiendaRepository;

    public TiendaService(TiendaRepository tiendaRepository) {
        this.tiendaRepository = tiendaRepository;
    }

    @Transactional
    public TiendaDTO saveTienda(TiendaDTO tiendaDTO) {
        // Opcional: Validar duplicados si usas findByNombre
        tiendaRepository.findByNombre(tiendaDTO.getNombre())
                .ifPresent(t -> {
                    throw new IllegalArgumentException("Ya existe una tienda con el nombre: " + tiendaDTO.getNombre());
                });

        Tienda tienda = new Tienda();
        tienda.setNombre(tiendaDTO.getNombre());
        tienda.setDireccion(tiendaDTO.getDireccion());
        Tienda savedTienda = tiendaRepository.save(tienda);
        return convertToDTO(savedTienda);
    }

    public List<TiendaDTO> getAllTiendas() {
        return tiendaRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TiendaDTO getTiendaById(Long id) {
        Tienda tienda = tiendaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tienda con ID " + id + " no encontrada"));
        return convertToDTO(tienda);
    }

    @Transactional
    public TiendaDTO updateTienda(Long id, TiendaDTO tiendaDTO) {
        Tienda tienda = tiendaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tienda con ID " + id + " no encontrada"));

        // Opcional: Validar duplicados si usas findByNombre
        tiendaRepository.findByNombre(tiendaDTO.getNombre())
            .filter(t -> !t.getId().equals(id))
            .ifPresent(t -> {
                throw new IllegalArgumentException("Ya existe una tienda con el nombre: " + tiendaDTO.getNombre());
            });

        tienda.setNombre(tiendaDTO.getNombre());
        tienda.setDireccion(tiendaDTO.getDireccion());
        Tienda updatedTienda = tiendaRepository.save(tienda);
        return convertToDTO(updatedTienda);
    }

    @Transactional
    public void deleteTienda(Long id) {
        Tienda tienda = tiendaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tienda con ID " + id + " no encontrada"));
        tiendaRepository.delete(tienda);
    }

    private TiendaDTO convertToDTO(Tienda tienda) {
        return new TiendaDTO(tienda.getId(), tienda.getNombre(), tienda.getDireccion());
    }
}