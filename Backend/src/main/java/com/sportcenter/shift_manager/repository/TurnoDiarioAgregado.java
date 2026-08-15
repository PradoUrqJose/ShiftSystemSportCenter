package com.sportcenter.shift_manager.repository;

import java.time.LocalDate;

/**
 * Proyección de {@link TurnoRepository#sumarizarPorColaboradorYDia}: una
 * fila por colaborador+fecha, con los turnos de ese día ya agregados.
 */
public interface TurnoDiarioAgregado {
    Long getColaboradorId();
    LocalDate getFecha();
    Integer getCantidadTurnos();
    Double getMinutosNetos();
    Boolean getEsFeriado();
}
