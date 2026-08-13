package com.sportcenter.shift_manager.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

/**
 * Se dispara cuando NO hay identidad válida (sin token, token vencido o
 * corrupto) y el endpoint la exige. Esto pasa en el filter chain, antes
 * de llegar a cualquier @Controller — por eso no lo maneja
 * GlobalExceptionHandler, que solo ve excepciones dentro de Spring MVC.
 */
@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        objectMapper.writeValue(response.getOutputStream(), Map.of("error", "No autenticado"));
    }
}
