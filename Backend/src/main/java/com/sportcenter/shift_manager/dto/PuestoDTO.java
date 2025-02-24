package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PuestoDTO {
    private Long id;
    private String nombre;
    private String descripcion;
}