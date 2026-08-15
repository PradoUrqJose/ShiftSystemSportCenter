package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.ResumenMensualDTO;
import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.dto.TurnoRequestDTO;
import com.sportcenter.shift_manager.service.TurnoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {
    private final TurnoService turnoService;

    public TurnoController(TurnoService turnoService) {
        this.turnoService = turnoService;
    }

    @PostMapping
    public ResponseEntity<TurnoDTO> saveTurno(@Valid @RequestBody TurnoRequestDTO turno) {
        TurnoDTO savedTurno = turnoService.saveTurno(turno);
        return ResponseEntity.ok(savedTurno);
    }

    @GetMapping("/{colaboradorId}")
    public ResponseEntity<List<TurnoDTO>> getTurnosByColaborador(@PathVariable Long colaboradorId) {
        return ResponseEntity.ok(turnoService.getTurnosByColaboradorId(colaboradorId));
    }

    @GetMapping
    public ResponseEntity<List<TurnoDTO>> getTurnosPorSemana(@RequestParam("fecha") String fecha) {
        return ResponseEntity.ok(turnoService.getTurnosPorSemanaDTO(fecha));
    }

    @GetMapping("/mensual/{colaboradorId}")
    public ResponseEntity<List<TurnoDTO>> getTurnosMensualesPorColaborador(
            @PathVariable Long colaboradorId,
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio) {
        return ResponseEntity.ok(turnoService.getTurnosMensualesPorColaborador(colaboradorId, mes, anio));
    }

    @GetMapping("/mensual")
    public ResponseEntity<Page<TurnoDTO>> getTurnosMensuales(
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio,
            @PageableDefault(size = 30) Pageable pageable) {
        return ResponseEntity.ok(turnoService.getTurnosMensuales(mes, anio, pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TurnoDTO> updateTurno(@PathVariable Long id, @Valid @RequestBody TurnoRequestDTO turno) {
        TurnoDTO updatedTurno = turnoService.updateTurno(id, turno);
        return ResponseEntity.ok(updatedTurno);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTurno(@PathVariable Long id) {
        turnoService.deleteTurno(id);
        return ResponseEntity.noContent().build();
    }

    // Deprecados: el frontend todavía los usa (SemanaService/TurnoService),
    // migrar en la Etapa 6 del plan de mantenibilidad a /semanal, que recibe
    // el rango de fechas directo en vez de pedirle al backend que primero
    // resuelva "qué semana es la número N del mes". Borrar estos dos junto
    // con TurnoService.calcularSemanasDelMes/getTurnosPorSemanaEstricta una
    // vez migrado.
    @Deprecated
    @GetMapping("/semanas-del-mes")
    public ResponseEntity<List<List<String>>> getSemanasDelMes(
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio) {
        return ResponseEntity.ok(turnoService.calcularSemanasDelMes(mes, anio));
    }

    @Deprecated
    @GetMapping("/semanal-estricto")
    public ResponseEntity<List<TurnoDTO>> getTurnosPorSemanaEstricta(
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio,
            @RequestParam("semana") int numeroSemana) {
        return ResponseEntity.ok(turnoService.getTurnosPorSemanaEstricta(mes, anio, numeroSemana));
    }

    // Reemplazo de /semanal-estricto: recibe el rango de fechas directo (el
    // frontend ya lo calcula localmente con date-fns), sin que el backend
    // tenga que resolver ningún índice de semana.
    @GetMapping("/semanal")
    public ResponseEntity<List<TurnoDTO>> getTurnosPorRangoFecha(
            @RequestParam("inicio") String inicio,
            @RequestParam("fin") String fin) {
        return ResponseEntity.ok(turnoService.getTurnosPorRangoFecha(LocalDate.parse(inicio), LocalDate.parse(fin)));
    }

    @GetMapping("/colab-tienda-fecha")
    public ResponseEntity<List<TurnoDTO>> getColaboradoresPorTiendaYRangoFechas(
            @RequestParam("tiendaId") Long tiendaId,
            @RequestParam("fechaInicio") String fechaInicio,
            @RequestParam("fechaFin") String fechaFin) {
        return ResponseEntity.ok(turnoService.getColaboradoresPorTiendaYRangoFechas(tiendaId, fechaInicio, fechaFin));
    }

    @GetMapping("/reporte")
    public ResponseEntity<List<TurnoDTO>> getHorasTrabajadasPorColaboradores(
            @RequestParam("fechaInicio") String fechaInicio,
            @RequestParam("fechaFin") String fechaFin,
            @RequestParam(value = "colaboradores", required = false) String colaboradores) {
        List<Long> colaboradoresIds = (colaboradores != null && !colaboradores.isEmpty())
                ? Arrays.stream(colaboradores.split(",")).map(Long::parseLong).toList()
                : new ArrayList<>();
        return ResponseEntity.ok(turnoService.getHorasTrabajadasPorColaboradores(colaboradoresIds, fechaInicio, fechaFin));
    }

    @GetMapping("/resumen-mensual")
    public ResponseEntity<List<ResumenMensualDTO>> getResumenMensual(
            @RequestParam("mes") int mes,
            @RequestParam("anio") int anio,
            @RequestParam(value = "colaboradores", required = false) String colaboradores) {
        List<Long> colaboradoresIds = (colaboradores != null && !colaboradores.isEmpty())
                ? Arrays.stream(colaboradores.split(",")).map(Long::parseLong).toList()
                : new ArrayList<>();
        return ResponseEntity.ok(turnoService.getResumenMensualPorColaboradores(colaboradoresIds, mes, anio));
    }
}
