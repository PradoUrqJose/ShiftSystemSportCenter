package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeriadoDTO {
    private LocalDate fecha;
    private String descripcion;
}