package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenTiendaDTO {
    private Long tiendaId;
    private String nombreTienda;
    private double horas;
    private double porcentaje;
}
