package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.service.ColaboradorService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/colaboradores")
public class ColaboradorController {
    private final ColaboradorService colaboradorService;

    public ColaboradorController(ColaboradorService colaboradorService) {
        this.colaboradorService = colaboradorService;
    }

    @PostMapping
    public ResponseEntity<ColaboradorDTO> saveColaborador(
            @Valid @RequestPart("colaborador") ColaboradorDTO colaboradorDTO,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        Colaborador colaborador = colaboradorService.saveColaborador(colaboradorDTO, file);
        ColaboradorDTO colaboradorResponse = colaboradorService.convertToDTO(colaborador);
        return ResponseEntity.ok(colaboradorResponse);
    }

    @GetMapping
    public ResponseEntity<List<ColaboradorDTO>> getAllColaboradores() {
        return ResponseEntity.ok(colaboradorService.getAllColaboradores());
    }

    @GetMapping("/empresa/{empresaId}")
    public ResponseEntity<List<ColaboradorDTO>> getColaboradoresByEmpresa(@PathVariable Long empresaId) {
        return ResponseEntity.ok(colaboradorService.getColaboradoresByEmpresa(empresaId));
    }

    @GetMapping("/filtro")
    public ResponseEntity<List<ColaboradorDTO>> getColaboradoresPorHabilitacion(@RequestParam boolean habilitado) {
        return ResponseEntity.ok(colaboradorService.getColaboradoresPorHabilitacion(habilitado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ColaboradorDTO> updateColaborador(
            @PathVariable Long id,
            @Valid @RequestPart("colaborador") ColaboradorDTO colaboradorDTO,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        Colaborador colaborador = colaboradorService.updateColaborador(id, colaboradorDTO, file);
        ColaboradorDTO dto = colaboradorService.convertToDTO(colaborador);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/habilitacion")
    public ResponseEntity<ColaboradorDTO> toggleHabilitacionColaborador(
            @PathVariable Long id, @RequestParam boolean habilitado) {
        Colaborador colaborador = colaboradorService.toggleHabilitacionColaborador(id, habilitado);
        ColaboradorDTO dto = colaboradorService.convertToDTO(colaborador);
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColaborador(@PathVariable Long id) {
        colaboradorService.deleteColaborador(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ColaboradorDTO> getColaboradorById(@PathVariable Long id) {
        Colaborador colaborador = colaboradorService.getColaboradorById(id);
        ColaboradorDTO dto = colaboradorService.convertToDTO(colaborador);
        return ResponseEntity.ok(dto);
    }
}
