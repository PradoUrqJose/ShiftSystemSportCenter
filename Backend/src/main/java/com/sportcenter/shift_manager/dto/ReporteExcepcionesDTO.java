package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReporteExcepcionesDTO {
    private LocalDate desde;
    private LocalDate hasta;
    private double umbralHorasDiarias;
    private double umbralJornadaExtrema;
    private int horizonteDias;
    private int errores;
    private int riesgos;
    private int advertencias;
    private int informativos;
    private List<ExcepcionReporteDTO> excepciones;
}
