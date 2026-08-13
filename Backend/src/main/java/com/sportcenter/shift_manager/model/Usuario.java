package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Usuario del sistema (quién puede entrar), separado a propósito de
 * Colaborador (el empleado operativo del centro deportivo). Son conceptos
 * distintos hoy: un Usuario ADMIN no necesariamente es un Colaborador, y
 * vincularlos ahora complicaría el rebuild v2. No hay registro público:
 * los crea un ADMIN (ver AuthController) o los siembra AdminSeeder al arrancar.
 */
@Entity
@Table(name = "usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 50)
    @Column(unique = true, nullable = false, length = 50)
    private String username;

    // Hash BCrypt, nunca la password en texto plano. Nunca se serializa a JSON.
    @NotBlank
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean habilitado = true;
}
