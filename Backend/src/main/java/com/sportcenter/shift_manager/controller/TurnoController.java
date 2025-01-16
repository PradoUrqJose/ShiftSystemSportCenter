package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.service.TurnoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/turnos")
@CrossOrigin(origins = "http://localhost:4200")
public class TurnoController {
    private final TurnoService turnoService;

    public TurnoController(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    // Obtener turnos para un colaborador específico
    @GetMapping("/{colaboradorId}")
    public List<Turno> getTurnosByColaborador(@PathVariable Long colaboradorId) {
        return turnoService.getTurnosByColaboradorId(colaboradorId);
    }

    // Obtener turnos por semana para todos los colaboradores
    @GetMapping
    public List<Turno> getTurnosPorSemana(@RequestParam("fecha") String fecha) {
        return turnoService.getTurnosPorSemana(fecha);
    }

    @PostMapping
    public Turno saveTurno(@RequestBody Turno turno) {
        return turnoService.saveTurno(turno);
    }

    @PutMapping("/{id}")
    public Turno updateTurno(@PathVariable Long id, @RequestBody Turno turno) {
        return turnoService.updateTurno(id, turno);
    }

    @DeleteMapping("/{id}")
    public void deleteTurno(@PathVariable Long id) {
        turnoService.deleteTurno(id);
    }
}
