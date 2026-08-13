package com.sportcenter.shift_manager.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404).body(ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(400).body(ex.getMessage());
    }

    // Login fallido: nunca decimos si falló el usuario o la contraseña,
    // solo que la combinación no es válida.
    @ExceptionHandler({BadCredentialsException.class, DisabledException.class})
    public ResponseEntity<String> handleAuthFailure(Exception ex) {
        return ResponseEntity.status(401).body("Usuario o contraseña incorrectos");
    }
}