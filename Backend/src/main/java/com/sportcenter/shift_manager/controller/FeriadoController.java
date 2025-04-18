package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.FeriadoDTO;
import com.sportcenter.shift_manager.service.FeriadoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/feriados")
public class FeriadoController {

    private final FeriadoService feriadoService;

    public FeriadoController(FeriadoService feriadoService) {
        this.feriadoService = feriadoService;
    }

    // Endpoint para obtener todos los feriados
    @GetMapping
    public ResponseEntity<List<FeriadoDTO>> getAllFeriados() {
        List<FeriadoDTO> feriados = feriadoService.getAllFeriados().stream()
                .map(f -> new FeriadoDTO(f.getFecha(), f.getDescripcion()))
                .toList();
        return ResponseEntity.ok(feriados);
    }

    // Endpoint para verificar si una fecha es feriado
    @GetMapping("/es-feriado")
    public ResponseEntity<Boolean> isFeriado(@RequestParam("fecha") String fecha) {
        try {
            LocalDate parsedDate = LocalDate.parse(fecha);
            boolean esFeriado = feriadoService.isFeriado(parsedDate);
            return ResponseEntity.ok(esFeriado);
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(false);
        }
    }
}