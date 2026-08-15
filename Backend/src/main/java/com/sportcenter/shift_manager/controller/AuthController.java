package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.dto.CreateUsuarioRequest;
import com.sportcenter.shift_manager.dto.LoginRequest;
import com.sportcenter.shift_manager.dto.LoginResponse;
import com.sportcenter.shift_manager.dto.UsuarioDTO;
import com.sportcenter.shift_manager.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * POST /login es la única ruta pública (ver SecurityConfig). No hay
 * registro público: crear usuarios nuevos es cosa de un ADMIN ya logueado,
 * vía POST /usuarios.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/usuarios")
    public ResponseEntity<UsuarioDTO> crearUsuario(@Valid @RequestBody CreateUsuarioRequest request) {
        return ResponseEntity.ok(authService.crearUsuario(request));
    }
}
