package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Fuente única para el Excel enviado a contabilidad. Todas las horas son
 * programadas y decimales; no representan asistencia ni importes de planilla.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProgramacionContableDTO {
    private LocalDate desde;
    private LocalDate hasta;
    private Long empresaId;
    private double umbralHorasDiarias;
    private int colaboradoresIncluidos;
    private int turnosIncluidos;
    private double totalHorasProgramadas;
    private double totalHorasEnFeriado;
    private List<ResumenProgramacionContableDTO> resumen;
    private List<TurnoProgramacionContableDTO> turnos;
}
