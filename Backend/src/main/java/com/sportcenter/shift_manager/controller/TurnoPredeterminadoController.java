package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.TurnoPredeterminadoDTO;
import com.sportcenter.shift_manager.service.TurnoPredeterminadoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/turnos-predeterminados")
public class TurnoPredeterminadoController {
    private final TurnoPredeterminadoService service;

    public TurnoPredeterminadoController(TurnoPredeterminadoService service) {
        this.service = service;
    }

    // Sin paginar: es una lista corta pensada para mostrarse entera como
    // botones (ver "Plantillas rápidas" en turno-modal.component.html).
    @GetMapping
    public ResponseEntity<List<TurnoPredeterminadoDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<TurnoPredeterminadoDTO> create(@Valid @RequestBody TurnoPredeterminadoDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
