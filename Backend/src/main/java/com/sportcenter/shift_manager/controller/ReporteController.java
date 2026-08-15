package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.dto.ProgramacionContableDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.dto.ResumenReporteDTO;
import com.sportcenter.shift_manager.service.ExcepcionReporteService;
import com.sportcenter.shift_manager.service.ReporteService;
import com.sportcenter.shift_manager.service.ResumenReporteService;
import com.sportcenter.shift_manager.service.ProgramacionContableService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {
    private final ReporteService reporteService;
    private final ExcepcionReporteService excepcionReporteService;
    private final ResumenReporteService resumenReporteService;
    private final ProgramacionContableService programacionContableService;

    public ReporteController(
            ReporteService reporteService,
            ExcepcionReporteService excepcionReporteService,
            ResumenReporteService resumenReporteService,
            ProgramacionContableService programacionContableService
    ) {
        this.reporteService = reporteService;
        this.excepcionReporteService = excepcionReporteService;
        this.resumenReporteService = resumenReporteService;
        this.programacionContableService = programacionContableService;
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

    @GetMapping("/programacion-contable")
    public ResponseEntity<ProgramacionContableDTO> getProgramacionContable(
            @RequestParam("desde") LocalDate desde,
            @RequestParam("hasta") LocalDate hasta,
            @RequestParam(value = "empresaId", required = false) Long empresaId,
            @RequestParam(value = "colaboradores", required = false) String colaboradores,
            @RequestParam(value = "umbralHorasDiarias", required = false) Double umbralHorasDiarias
    ) {
        List<Long> colaboradorIds;
        try {
            colaboradorIds = colaboradores == null || colaboradores.isBlank()
                    ? List.of()
                    : Arrays.stream(colaboradores.split(",")).map(Long::parseLong).toList();
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Los colaboradores deben ser identificadores numéricos");
        }
        return ResponseEntity.ok(programacionContableService.getProgramacion(
                desde, hasta, empresaId, colaboradorIds, umbralHorasDiarias));
    }
}
