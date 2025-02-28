package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumenMensualDTO {
    private Long colaboradorId;
    private String nombreColaborador;
    private double totalHorasMes;
    private int diasFeriadosTrabajados;
    private double horasEnFeriados;
    private List<TurnoDTO> turnos; // Opcional: lista detallada de turnos
}