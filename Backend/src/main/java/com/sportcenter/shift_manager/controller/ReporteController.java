package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.dto.ResumenReporteDTO;
import com.sportcenter.shift_manager.service.ExcepcionReporteService;
import com.sportcenter.shift_manager.service.ReporteService;
import com.sportcenter.shift_manager.service.ResumenReporteService;
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
    private final ResumenReporteService resumenReporteService;

    public ReporteController(
            ReporteService reporteService,
            ExcepcionReporteService excepcionReporteService,
            ResumenReporteService resumenReporteService
    ) {
        this.reporteService = reporteService;
        this.excepcionReporteService = excepcionReporteService;
        this.resumenReporteService = resumenReporteService;
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

    @GetMapping("/resumen")
    public ResponseEntity<ResumenReporteDTO> getResumen(
            @RequestParam("desde") LocalDate desde,
            @RequestParam("hasta") LocalDate hasta,
            @RequestParam(value = "empresaId", required = false) Long empresaId,
            @RequestParam(value = "umbralHorasDiarias", required = false) Double umbralHorasDiarias,
            @RequestParam(value = "umbralJornadaExtrema", required = false) Double umbralJornadaExtrema,
            @RequestParam(value = "horizonteDias", required = false) Integer horizonteDias
    ) {
        return ResponseEntity.ok(resumenReporteService.getResumen(
                desde, hasta, empresaId, umbralHorasDiarias, umbralJornadaExtrema, horizonteDias));
    }
}
