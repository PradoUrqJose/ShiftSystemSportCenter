package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.service.ReporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {
    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    // Protegido por el default de SecurityConfig (anyRequest().hasRole("ADMIN")):
    // no hay ningún requestMatcher más específico para /api/reportes/**, así
    // que ya cae bajo ese "fail closed" sin cambios adicionales.
    @GetMapping("/preliquidacion")
    public ResponseEntity<List<PreliquidacionMensualDTO>> getPreliquidacionMensual(
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio,
            @RequestParam(value = "empresaId", required = false) Long empresaId,
            @RequestParam(value = "umbralHorasDiarias", required = false) Double umbralHorasDiarias
    ) {
        return ResponseEntity.ok(reporteService.getPreliquidacionMensual(mes, anio, empresaId, umbralHorasDiarias));
    }
}
