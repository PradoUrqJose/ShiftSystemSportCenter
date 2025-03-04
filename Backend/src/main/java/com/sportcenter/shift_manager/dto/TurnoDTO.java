package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TurnoDTO {
    private Long id;
    private Long colaboradorId;
    private String nombreColaborador;
    private String dniColaborador;
    private String nombreEmpresa;
    private Long empresaId; // Nuevo campo
    private Long tiendaId;
    private String nombreTienda;
    private LocalDate fecha;
    private LocalTime horaEntrada;
    private LocalTime horaSalida;
    private double horasTrabajadas;
    private boolean tomoAlmuerzo;
    private double horasTotalesSemana;
    private boolean esFeriado;
}
