package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/** Portada operativa: resume datos existentes y conserva drill-down auditable. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenReporteDTO {
    private LocalDate desde;
    private LocalDate hasta;
    private Long empresaId;
    private double umbralHorasDiarias;
    private double umbralJornadaExtrema;
    private int horizonteDias;

    private double totalHorasProgramadas;
    private double horasEnFeriado;
    private int colaboradoresProgramados;
    private int colaboradoresConCargaExcepcional;
    private int erroresDatos;
    private int hallazgosPorConciliar;

    private List<ResumenSemanaDTO> semanas;
    private List<ResumenTiendaDTO> tiendas;
    private List<ExcepcionReporteDTO> requiereAtencion;
}
