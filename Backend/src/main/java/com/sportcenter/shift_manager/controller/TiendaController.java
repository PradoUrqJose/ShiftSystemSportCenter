package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.TiendaDTO;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.service.TiendaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tiendas")
public class TiendaController {
    private final TiendaService tiendaService;

    public TiendaController(TiendaService tiendaService) {
        this.tiendaService = tiendaService;
    }

    @PostMapping
    public ResponseEntity<TiendaDTO> createTienda(@Valid @RequestBody TiendaDTO tiendaDTO) {
        TiendaDTO savedTienda = tiendaService.saveTienda(tiendaDTO);
        return ResponseEntity.ok(savedTienda);
    }

    @GetMapping
    public ResponseEntity<List<TiendaDTO>> getAllTiendas() {
        List<TiendaDTO> tiendas = tiendaService.getAllTiendas();
        return ResponseEntity.ok(tiendas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TiendaDTO> getTiendaById(@PathVariable Long id) {
        TiendaDTO tienda = tiendaService.getTiendaById(id);
        return ResponseEntity.ok(tienda);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TiendaDTO> updateTienda(@PathVariable Long id, @Valid @RequestBody TiendaDTO tiendaDTO) {
        TiendaDTO updatedTienda = tiendaService.updateTienda(id, tiendaDTO);
        return ResponseEntity.ok(updatedTienda);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTienda(@PathVariable Long id) {
        tiendaService.deleteTienda(id);
        return ResponseEntity.noContent().build();
    }
}