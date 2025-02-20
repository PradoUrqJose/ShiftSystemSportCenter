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
    private Long tiendaId; // Agregar el ID de la tienda
    private String nombreTienda;
    private LocalDate fecha;
    private LocalTime horaEntrada;
    private LocalTime horaSalida;
    private double horasTrabajadas;
    private boolean tomoAlmuerzo; // Nuevo atributo
    private double horasTotalesSemana; // ✅ Nuevo atributo
    private boolean esFeriado;
}
