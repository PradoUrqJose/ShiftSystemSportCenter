package com.sportcenter.shift_manager.repository;

/**
 * Proyección de {@link TurnoRepository#sumarizarPorColaboradorYTienda}: una
 * fila por colaborador+empresa histórica+tienda, con el total de horas netas
 * en esa tienda.
 */
public interface TurnoTiendaAgregado {
    Long getColaboradorId();
    Long getEmpresaId();
    Long getTiendaId();
    String getNombreTienda();
    Double getHoras();
}
