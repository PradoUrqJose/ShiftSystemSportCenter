package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Horas programadas por un colaborador en una tienda dentro de un período. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DistribucionTiendaDTO {
    private Long tiendaId;
    private String nombreTienda;
    private double horas;
}
