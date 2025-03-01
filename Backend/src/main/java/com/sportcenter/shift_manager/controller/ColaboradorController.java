package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.service.ColaboradorService;
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
    public ResponseEntity<ColaboradorDTO> saveColaborador(@RequestPart("colaborador") ColaboradorDTO colaboradorDTO,
                                                          @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        Colaborador colaborador = colaboradorService.saveColaborador(colaboradorDTO, file);

        // Convertir el Colaborador a ColaboradorDTO para devolverlo
        ColaboradorDTO colaboradorResponse = colaboradorService.convertToDTO(colaborador);

        return ResponseEntity.ok(colaboradorResponse);
    }

    @GetMapping
    public List<ColaboradorDTO> getAllColaboradores() {
        return colaboradorService.getAllColaboradores();
    }

    @GetMapping("/empresa/{empresaId}")
    public List<ColaboradorDTO> getColaboradoresByEmpresa(@PathVariable Long empresaId) {
        return colaboradorService.getColaboradoresByEmpresa(empresaId);
    }

    @GetMapping("/filtro")
    public List<ColaboradorDTO> getColaboradoresPorHabilitacion(@RequestParam boolean habilitado) {
        return colaboradorService.getColaboradoresPorHabilitacion(habilitado);
    }

    @PutMapping("/{id}")
    public Colaborador updateColaborador(@PathVariable Long id,
                                         @RequestPart("colaborador") ColaboradorDTO colaboradorDTO,
                                         @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {
        return colaboradorService.updateColaborador(id, colaboradorDTO, file);
    }

    @PutMapping("/{id}/habilitacion")
    public Colaborador toggleHabilitacionColaborador(@PathVariable Long id, @RequestParam boolean habilitado) {
        return colaboradorService.toggleHabilitacionColaborador(id, habilitado);
    }

    @DeleteMapping("/{id}")
    public void deleteColaborador(@PathVariable Long id) {
        colaboradorService.deleteColaborador(id);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ColaboradorDTO> getColaboradorById(@PathVariable Long id) {
        Colaborador colaborador = colaboradorService.getColaboradorById(id);
        ColaboradorDTO dto = colaboradorService.convertToDTO(colaborador);
        return ResponseEntity.ok(dto);
    }
}
