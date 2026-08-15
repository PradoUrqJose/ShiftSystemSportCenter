package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.CreateUsuarioRequest;
import com.sportcenter.shift_manager.dto.LoginRequest;
import com.sportcenter.shift_manager.dto.LoginResponse;
import com.sportcenter.shift_manager.dto.UsuarioDTO;
import com.sportcenter.shift_manager.model.Usuario;
import com.sportcenter.shift_manager.repository.UsuarioRepository;
import com.sportcenter.shift_manager.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        // Si username/password no matchean, esto lanza BadCredentialsException
        // (la captura GlobalExceptionHandler y responde 401 con mensaje genérico:
        // nunca decimos si falló el usuario o la contraseña).
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername())
                .orElseThrow(); // no debería pasar: authenticate() ya lo validó arriba

        String token = jwtService.generateToken(usuario);
        log.info("Login exitoso: username={}", usuario.getUsername());
        return new LoginResponse(token, usuario.getUsername(), usuario.getRole().name());
    }

    @Transactional
    public UsuarioDTO crearUsuario(CreateUsuarioRequest request) {
        if (usuarioRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Ya existe un usuario con el username: " + request.getUsername());
        }

        Usuario usuario = new Usuario();
        usuario.setUsername(request.getUsername());
        usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuario.setRole(request.getRole());
        usuario.setHabilitado(true);

        Usuario guardado = usuarioRepository.save(usuario);
        log.info("Usuario creado: username={}, role={}", guardado.getUsername(), guardado.getRole());
        return new UsuarioDTO(guardado.getId(), guardado.getUsername(), guardado.getRole().name(), guardado.isHabilitado());
    }
}
