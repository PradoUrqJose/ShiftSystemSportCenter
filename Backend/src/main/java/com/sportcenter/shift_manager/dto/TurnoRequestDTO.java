package com.sportcenter.shift_manager.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

// DTO de entrada para crear/editar un turno. Reemplaza a la entidad Turno como
// @RequestBody: antes el cliente podía mandar cualquier campo de la entidad
// (incluidas relaciones completas de colaborador/empresa/tienda) y ahora solo
// puede mandar los IDs y los datos que realmente edita.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TurnoRequestDTO {
    @NotNull(message = "El colaborador es obligatorio")
    private Long colaboradorId;

    @NotNull(message = "La tienda es obligatoria")
    private Long tiendaId;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "La hora de entrada es obligatoria")
    private LocalTime horaEntrada;

    @NotNull(message = "La hora de salida es obligatoria")
    private LocalTime horaSalida;
}
