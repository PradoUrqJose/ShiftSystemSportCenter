package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.repository.TiendaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TiendaService {
    private final TiendaRepository tiendaRepository;

    public TiendaService(TiendaRepository tiendaRepository) {
        this.tiendaRepository = tiendaRepository;
    }

    public Tienda saveTienda(Tienda tienda) {
        return tiendaRepository.save(tienda);
    }

    public List<Tienda> getAllTiendas() {
        return tiendaRepository.findAll();
    }

    public Tienda getTiendaById(Long id) {
        return tiendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
    }

    public Tienda updateTienda(Long id, Tienda updatedTienda) {
        return tiendaRepository.findById(id).map(tienda -> {
            tienda.setNombre(updatedTienda.getNombre());
            tienda.setDireccion(updatedTienda.getDireccion());
            return tiendaRepository.save(tienda);
        }).orElseThrow(() -> new RuntimeException("Tienda no encontrada"));
    }

    public void deleteTienda(Long id) {
        tiendaRepository.deleteById(id);
    }
}