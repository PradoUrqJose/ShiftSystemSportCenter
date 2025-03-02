package com.sportcenter.shift_manager.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColaboradorDTO {
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 15, message = "El nombre no puede exceder 15 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 20, message = "El apellido no puede exceder 20 caracteres")
    private String apellido;

    @NotBlank(message = "El DNI es obligatorio")
    @Size(min = 8, max = 8, message = "El DNI debe tener 8 caracteres")
    private String dni;

    @Size(max = 15, message = "El teléfono no puede exceder 15 caracteres")
    private String telefono;

    @Email(message = "El email debe ser válido")
    private String email;

    private Long empresaId;

    private String empresaNombre;
    private String fotoUrl;
    private boolean habilitado;

    private LocalDate fechaNacimiento;

    private Long puestoId;
    private String puestoNombre;
}
