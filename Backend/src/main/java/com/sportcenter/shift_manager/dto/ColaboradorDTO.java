package com.sportcenter.shift_manager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColaboradorDTO {
    private Long id;          // ID del colaborador
    private String nombre;    // Nombre del colaborador
    private String dni;       // DNI del colaborador
    private Long empresaId;   // ID de la empresa asociada
    private String empresaNombre; // Nombre de la empresa asociada
}
