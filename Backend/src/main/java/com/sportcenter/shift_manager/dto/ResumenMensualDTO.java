package com.sportcenter.shift_manager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumenMensualDTO {
    @NotNull(message = "El ID del colaborador es obligatorio")
    private Long colaboradorId;

    @NotBlank(message = "El nombre del colaborador es obligatorio")
    private String nombreColaborador;

    private double totalHorasMes;
    private int diasFeriadosTrabajados;
    private double horasEnFeriados;
    private List<TurnoDTO> turnos; // Opcional: lista detallada de turnos
}