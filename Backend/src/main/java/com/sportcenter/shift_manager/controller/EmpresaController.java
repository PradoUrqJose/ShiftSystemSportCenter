package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.EmpresaDTO;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.service.EmpresaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {
    private final EmpresaService empresaService;

    public EmpresaController(EmpresaService empresaService) {
        this.empresaService = empresaService;
    }

    @PostMapping
    public ResponseEntity<EmpresaDTO> saveEmpresa(@Valid @RequestBody Empresa empresa) {
        Empresa savedEmpresa = empresaService.saveEmpresa(empresa);
        return ResponseEntity.ok(convertToDTO(savedEmpresa));
    }

    @GetMapping
    public ResponseEntity<List<EmpresaDTO>> getAllEmpresas() {
        return ResponseEntity.ok(empresaService.getAllEmpresas());
    }

    @GetMapping("/{id}/numero-empleados")
    public ResponseEntity<Integer> getNumeroDeEmpleados(@PathVariable Long id) {
        return ResponseEntity.ok(empresaService.getNumeroDeEmpleados(id));
    }

    @GetMapping("/filtro")
    public ResponseEntity<List<EmpresaDTO>> getEmpresasPorHabilitacion(@RequestParam boolean habilitada) {
        return ResponseEntity.ok(empresaService.getEmpresasPorHabilitacion(habilitada));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmpresaDTO> updateEmpresa(@PathVariable Long id, @Valid @RequestBody Empresa empresaDetails) {
        Empresa updatedEmpresa = empresaService.updateEmpresa(id, empresaDetails);
        return ResponseEntity.ok(convertToDTO(updatedEmpresa));
    }

    @PutMapping("/{id}/habilitacion")
    public ResponseEntity<EmpresaDTO> toggleHabilitacionEmpresa(@PathVariable Long id, @RequestParam boolean habilitada) {
        Empresa toggledEmpresa = empresaService.toggleHabilitacionEmpresa(id, habilitada);
        return ResponseEntity.ok(convertToDTO(toggledEmpresa));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmpresa(@PathVariable Long id) {
        empresaService.deleteEmpresa(id);
        return ResponseEntity.noContent().build();
    }

    // Método auxiliar para convertir a DTO (puedes moverlo a EmpresaService si prefieres)
    private EmpresaDTO convertToDTO(Empresa empresa) {
        return new EmpresaDTO(
                empresa.getId(),
                empresa.getNombre(),
                empresa.getRuc(),
                empresa.getNumeroDeEmpleados(),
                empresa.isHabilitada()
        );
    }
}