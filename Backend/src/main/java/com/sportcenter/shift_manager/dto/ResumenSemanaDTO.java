package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenSemanaDTO {
    private LocalDate inicio;
    private LocalDate fin;
    private double horasRegulares;
    private double horasEnFeriado;
}
