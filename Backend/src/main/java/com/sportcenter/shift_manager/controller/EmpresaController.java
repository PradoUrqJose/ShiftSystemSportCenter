package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.EmpresaDTO;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.service.EmpresaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empresas")
@CrossOrigin(origins = "http://localhost:4200")
public class EmpresaController {
    private final EmpresaService empresaService;

    public EmpresaController(EmpresaService empresaService) {
        this.empresaService = empresaService;
    }

    @PostMapping
    public Empresa saveEmpresa(@RequestBody Empresa empresa) {
        return empresaService.saveEmpresa(empresa);
    }

    @GetMapping
    public List<EmpresaDTO> getAllEmpresas() {
        return empresaService.getAllEmpresas();
    }
    
    @GetMapping("/{id}/numero-empleados")
    public int getNumeroDeEmpleados(@PathVariable Long id) {
        return empresaService.getNumeroDeEmpleados(id);
    }
    
    @PutMapping("/{id}")
    public Empresa updateEmpresa(@PathVariable Long id, @RequestBody Empresa empresaDetails) {
        return empresaService.updateEmpresa(id, empresaDetails);
    }

    @DeleteMapping("/{id}")
    public void deleteEmpresa(@PathVariable Long id) {
        empresaService.deleteEmpresa(id);
    }

    @PutMapping("/{id}/habilitacion")
    public Empresa toggleHabilitacionEmpresa(@PathVariable Long id, @RequestParam boolean habilitada) {
        return empresaService.toggleHabilitacionEmpresa(id, habilitada);
    }

    @GetMapping("/filtro")
    public List<EmpresaDTO> getEmpresasPorHabilitacion(@RequestParam boolean habilitada) {
        return empresaService.getEmpresasPorHabilitacion(habilitada);
    }
}

