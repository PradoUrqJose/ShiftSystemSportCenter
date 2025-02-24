package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.PuestoDTO;
import com.sportcenter.shift_manager.service.PuestoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/puestos")
@CrossOrigin(origins = "http://localhost:4200")
public class PuestoController {
    private final PuestoService puestoService;

    public PuestoController(PuestoService puestoService) {
        this.puestoService = puestoService;
    }

    @PostMapping
    public ResponseEntity<PuestoDTO> savePuesto(@RequestBody PuestoDTO puestoDTO) {
        PuestoDTO savedPuesto = puestoService.savePuesto(puestoDTO);
        return ResponseEntity.ok(savedPuesto);
    }

    @GetMapping
    public ResponseEntity<List<PuestoDTO>> getAllPuestos() {
        List<PuestoDTO> puestos = puestoService.getAllPuestos();
        return ResponseEntity.ok(puestos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PuestoDTO> getPuestoById(@PathVariable Long id) {
        PuestoDTO puesto = puestoService.getPuestoById(id);
        return ResponseEntity.ok(puesto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PuestoDTO> updatePuesto(@PathVariable Long id, @RequestBody PuestoDTO puestoDTO) {
        PuestoDTO updatedPuesto = puestoService.updatePuesto(id, puestoDTO);
        return ResponseEntity.ok(updatedPuesto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePuesto(@PathVariable Long id) {
        puestoService.deletePuesto(id);
        return ResponseEntity.noContent().build();
    }
}