package com.sportcenter.shift_manager.repository;

import java.time.LocalDate;

/**
 * Proyección de {@link TurnoRepository#sumarizarPorColaboradorYDia}: una
 * fila por colaborador+empresa histórica+fecha, con los turnos de ese día
 * ya agregados. La empresa sale de turno.empresa_id, no de la asignación
 * actual del colaborador.
 */
public interface TurnoDiarioAgregado {
    Long getColaboradorId();
    Long getEmpresaId();
    String getNombreEmpresa();
    LocalDate getFecha();
    Integer getCantidadTurnos();
    Double getMinutosNetos();
    Boolean getEsFeriado();
}
