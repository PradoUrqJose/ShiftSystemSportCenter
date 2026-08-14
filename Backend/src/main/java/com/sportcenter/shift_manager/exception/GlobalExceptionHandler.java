package com.sportcenter.shift_manager.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;

// Extiende ResponseEntityExceptionHandler (no solo @ControllerAdvice) para poder
// sobreescribir cómo se maneja MethodArgumentNotValidException: si no, cae en el
// @ExceptionHandler(Exception.class) de más abajo y una validación de @Valid
// fallida (ej. falta un campo obligatorio) respondería 500 en vez de 400.
@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException ex) {
        log.debug("404: {}", ex.getMessage());
        return ResponseEntity.status(404).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        log.debug("400: {}", ex.getMessage());
        return ResponseEntity.status(400).body(ex.getMessage());
    }

    // @Valid falló (ej. TurnoRequestDTO sin fecha, ColaboradorDTO con nombre en
    // blanco): responde 400 con campo -> mensaje en vez del 500 genérico.
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errores = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe ->
                errores.put(fe.getField(), fe.getDefaultMessage()));
        log.debug("400 (validación): {}", errores);
        return ResponseEntity.badRequest().body(errores);
    }

    // Login fallido: nunca decimos si falló el usuario o la contraseña,
    // solo que la combinación no es válida.
    @ExceptionHandler({BadCredentialsException.class, DisabledException.class})
    public ResponseEntity<String> handleAuthFailure(Exception ex) {
        log.warn("Intento de login fallido: {}", ex.getMessage());
        return ResponseEntity.status(401).body("Usuario o contraseña incorrectos");
    }

    // Red de contención: cualquier excepción no prevista antes no debe filtrar
    // stack traces ni mensajes internos al cliente, pero sí queda logueada acá
    // para poder diagnosticarla.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleUnexpected(Exception ex) {
        log.error("Error interno no controlado", ex);
        return ResponseEntity.status(500).body("Ocurrió un error interno. Intentá de nuevo más tarde.");
    }
}
