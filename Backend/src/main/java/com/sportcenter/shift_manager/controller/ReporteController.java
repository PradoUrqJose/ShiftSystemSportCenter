package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.service.ExcepcionReporteService;
import com.sportcenter.shift_manager.service.ReporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {
    private final ReporteService reporteService;
    private final ExcepcionReporteService excepcionReporteService;

    public ReporteController(ReporteService reporteService, ExcepcionReporteService excepcionReporteService) {
        this.reporteService = reporteService;
        this.excepcionReporteService = excepcionReporteService;
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

    @GetMapping("/excepciones")
    public ResponseEntity<ReporteExcepcionesDTO> getExcepciones(
            @RequestParam("desde") LocalDate desde,
            @RequestParam("hasta") LocalDate hasta,
            @RequestParam(value = "empresaId", required = false) Long empresaId,
            @RequestParam(value = "umbralHorasDiarias", required = false) Double umbralHorasDiarias,
            @RequestParam(value = "umbralJornadaExtrema", required = false) Double umbralJornadaExtrema,
            @RequestParam(value = "horizonteDias", required = false) Integer horizonteDias
    ) {
        return ResponseEntity.ok(excepcionReporteService.getExcepciones(
                desde, hasta, empresaId, umbralHorasDiarias, umbralJornadaExtrema, horizonteDias));
    }
}
