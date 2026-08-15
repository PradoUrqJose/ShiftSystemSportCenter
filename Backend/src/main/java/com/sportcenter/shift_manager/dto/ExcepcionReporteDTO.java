package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Hallazgo verificable del reporte de excepciones. No representa por sí solo
 * una infracción laboral: parte de turnos programados, no de asistencia o
 * pagos, y conserva los IDs que permiten auditar su origen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExcepcionReporteDTO {
    private String codigo;
    private String severidad;
    private String titulo;
    private String detalle;

    private Long colaboradorId;
    private String nombreColaborador;
    private String dni;
    private Long empresaId;
    private String nombreEmpresa;

    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private Double horasProgramadas;
    private Double umbralHoras;
    private Integer cantidadTurnos;
    private List<Long> turnoIds;
}
