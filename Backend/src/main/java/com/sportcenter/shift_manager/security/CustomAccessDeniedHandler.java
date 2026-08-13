package com.sportcenter.shift_manager.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

/**
 * Se dispara cuando SÍ hay identidad válida, pero su rol no alcanza
 * (ej. un COLABORADOR pegándole a un endpoint hasRole("ADMIN")).
 * Distinto del 401 de arriba a propósito: acá el problema no es "quién
 * sos", es "qué te dejamos hacer".
 */
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException, ServletException {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        objectMapper.writeValue(response.getOutputStream(), Map.of("error", "No tiene permisos para esta acción"));
    }
}
