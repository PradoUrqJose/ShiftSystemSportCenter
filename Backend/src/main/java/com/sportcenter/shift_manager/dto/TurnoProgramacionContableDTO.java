package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TurnoProgramacionContableDTO {
    private Long turnoId;
    private Long colaboradorId;
    private String dni;
    private String nombre;
    private String apellido;
    private Long empresaId;
    private String nombreEmpresa;
    private String rucEmpresa;
    private Long tiendaId;
    private String nombreTienda;
    private LocalDate fecha;
    private LocalTime horaEntrada;
    private LocalTime horaSalida;
    private double horasProgramadas;
    private boolean descuentoAlmuerzo;
    private boolean feriado;
    private boolean turnoPartido;
}
