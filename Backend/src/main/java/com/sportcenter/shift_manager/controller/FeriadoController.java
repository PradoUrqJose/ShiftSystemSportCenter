package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.FeriadoDTO;
import com.sportcenter.shift_manager.model.Feriado;
import com.sportcenter.shift_manager.service.FeriadoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

// Los GET son de lectura para cualquier autenticado; POST/PUT/DELETE quedan
// ADMIN-only (ver SecurityConfig, regla centralizada por verbo/URL).
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
                .map(this::convertToDTO)
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

    @PostMapping
    public ResponseEntity<FeriadoDTO> crearFeriado(@Valid @RequestBody FeriadoDTO dto) {
        Feriado creado = feriadoService.crearFeriado(dto);
        return ResponseEntity.ok(convertToDTO(creado));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeriadoDTO> actualizarFeriado(@PathVariable Long id, @Valid @RequestBody FeriadoDTO dto) {
        Feriado actualizado = feriadoService.actualizarFeriado(id, dto);
        return ResponseEntity.ok(convertToDTO(actualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarFeriado(@PathVariable Long id) {
        feriadoService.eliminarFeriado(id);
        return ResponseEntity.noContent().build();
    }

    private FeriadoDTO convertToDTO(Feriado feriado) {
        return new FeriadoDTO(feriado.getId(), feriado.getFecha(), feriado.getDescripcion());
    }
}