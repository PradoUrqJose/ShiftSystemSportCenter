package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.service.ColaboradorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/colaboradores")
@CrossOrigin(origins = "http://localhost:4200")
public class ColaboradorController {
    private final ColaboradorService colaboradorService;

    public ColaboradorController(ColaboradorService colaboradorService) {
        this.colaboradorService = colaboradorService;
    }

    @PostMapping
    public Colaborador saveColaborador(@RequestBody ColaboradorDTO colaboradorDTO) {
        return colaboradorService.saveColaborador(colaboradorDTO);
    }

    @GetMapping
    public List<Colaborador> getAllColaboradores() {
        return colaboradorService.getAllColaboradores();
    }

    @GetMapping("/empresa/{empresaId}")
    public List<Colaborador> getColaboradoresByEmpresa(@PathVariable Long empresaId) {
        return colaboradorService.getColaboradoresByEmpresa(empresaId);
    }

    @PutMapping("/{id}")
    public Colaborador updateColaborador(@PathVariable Long id, @RequestBody ColaboradorDTO colaboradorDTO) {
        return colaboradorService.updateColaborador(id, colaboradorDTO);
    }

    @DeleteMapping("/{id}")
    public void deleteColaborador(@PathVariable Long id) {
        colaboradorService.deleteColaborador(id);
    }
}
