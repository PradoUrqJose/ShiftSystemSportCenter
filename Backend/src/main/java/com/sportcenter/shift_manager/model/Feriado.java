package com.sportcenter.shift_manager.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Feriado {
    private LocalDate fecha;
    private String descripcion;
}