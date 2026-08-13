package com.sportcenter.shift_manager.model;

/**
 * Roles mínimos de esta etapa. El rebuild v2 va a tener 4 roles reales
 * (Colaborador, Admin, Coordinador, Operador) con permisos finos por
 * empresa/tienda; acá alcanza con 2 para tapar el hueco de seguridad
 * actual sin sobre-construir algo que se va a tirar.
 */
public enum Role {
    ADMIN,
    COLABORADOR
}
