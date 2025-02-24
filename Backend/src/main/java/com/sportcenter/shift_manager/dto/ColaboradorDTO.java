package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColaboradorDTO {
    private Long id;
    private String nombre;
    private String apellido;
    private String dni;
    private String telefono;
    private String email;
    private Long empresaId;
    private String empresaNombre;
    private String fotoUrl; // Cambié de byte[] a String para la URL de la foto
    private boolean habilitado;
    private LocalDate fechaNacimiento;
    // Cambios para Puesto
    private Long puestoId;
    private String puestoNombre;
}
