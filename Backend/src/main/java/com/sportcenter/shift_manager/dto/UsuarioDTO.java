package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Nunca incluye la password: es lo que se devuelve al cliente. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioDTO {
    private Long id;
    private String username;
    private String role;
    private boolean habilitado;
}
