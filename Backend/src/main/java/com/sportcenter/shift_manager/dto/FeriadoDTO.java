package com.sportcenter.shift_manager.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeriadoDTO {
    // Null al crear (el cliente no lo manda); presente en las respuestas
    // para que el frontend pueda referenciar cuál editar/borrar.
    private Long id;
    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;
    @Size(max = 255, message = "La descripción no puede exceder 255 caracteres")
    private String descripcion;
}