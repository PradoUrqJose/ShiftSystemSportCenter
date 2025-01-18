package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.TurnoDTO;
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

    // Obtener turnos para un colaborador específico (retorna DTO)
    @GetMapping("/{colaboradorId}")
    public List<TurnoDTO> getTurnosByColaborador(@PathVariable Long colaboradorId) {
        return turnoService.getTurnosByColaboradorId(colaboradorId);
    }

    // Obtener turnos por semana para todos los colaboradores (retorna entidad completa, si es necesario)
    @GetMapping
    public List<TurnoDTO> getTurnosPorSemana(@RequestParam("fecha") String fecha) {
        return turnoService.getTurnosPorSemanaDTO(fecha); // Agregar este método al servicio si quieres retornar DTOs aquí
    }

    // Crear un turno (retorna DTO en lugar de entidad completa)
    @PostMapping
    public TurnoDTO saveTurno(@RequestBody Turno turno) {
        Turno savedTurno = turnoService.saveTurno(turno);
        return turnoService.convertToDTO(savedTurno); // Convertimos a DTO para incluir colaboradorId y otros datos
    }

    // Actualizar un turno (sin DTO, ya que recibe entidad completa)
    @PutMapping("/{id}")
    public Turno updateTurno(@PathVariable Long id, @RequestBody Turno turno) {
        return turnoService.updateTurno(id, turno);
    }

    // Eliminar un turno
    @DeleteMapping("/{id}")
    public void deleteTurno(@PathVariable Long id) {
        turnoService.deleteTurno(id);
    }
}
