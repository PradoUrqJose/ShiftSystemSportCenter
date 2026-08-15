package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenProgramacionContableDTO {
    private Long colaboradorId;
    private String dni;
    private String nombre;
    private String apellido;
    private Long empresaId;
    private String nombreEmpresa;
    private String rucEmpresa;
    private int diasProgramados;
    private int cantidadTurnos;
    private double horasRegulares;
    private double horasEnFeriado;
    private double totalHorasProgramadas;
    private double horasSobreUmbralDiario;
    private int diasConTurnoPartido;
}
