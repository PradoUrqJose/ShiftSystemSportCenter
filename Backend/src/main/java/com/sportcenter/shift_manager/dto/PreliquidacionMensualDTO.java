package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Proyección contable por colaborador para un mes+año dado: la fila que
 * contabilidad necesita para revisar horas programadas, sin depender de
 * volver a sumar turnos en el frontend.
 *
 * Es un reporte de solo lectura, siempre recalculado a partir de los turnos
 * — no persiste estado ni observaciones (eso queda para cuando exista un
 * módulo de asistencia/contratos real).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreliquidacionMensualDTO {
    private Long colaboradorId;
    private String dni;
    private String nombre;
    private String apellido;

    private Long empresaId;
    private String nombreEmpresa;
    private Long puestoId;
    private String nombrePuesto;

    private int diasProgramados;
    private double totalHorasMes;
    private double horasEnFeriados;

    // Señal aproximada, no un cálculo legal de horas extra: suma, día por
    // día, lo que exceda umbralHorasDiariasUsado. No considera jornada
    // semanal (no existe ese dato en Colaborador todavía).
    private double horasExtraCandidatas;
    private double umbralHorasDiariasUsado;

    // Días con más de un turno registrado para este colaborador (no hay
    // relación "turno partido" en el modelo; se infiere del conteo).
    private int turnosPartidos;

    private List<DistribucionTiendaDTO> distribucionPorTienda;

    // Detalle de turnos del mes, para drill-down y la hoja "Detalle" del
    // export a Excel.
    private List<TurnoDTO> turnos;
}
