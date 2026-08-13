package com.sportcenter.shift_manager.config;

import com.sportcenter.shift_manager.model.Role;
import com.sportcenter.shift_manager.model.Usuario;
import com.sportcenter.shift_manager.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el primer usuario ADMIN al arrancar, si no existe todavía. No hay
 * registro público (ver AuthController), así que sin esto no habría forma
 * de entrar la primera vez. Es tolerante a que falten las variables de
 * entorno: si no están, no hace nada y loguea un aviso, no rompe el
 * arranque (mismo criterio que ya usaba el viejo DotenvConfig).
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;

    public AdminSeeder(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${ADMIN_USERNAME:}") String adminUsername,
            @Value("${ADMIN_PASSWORD:}") String adminPassword) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (adminUsername.isBlank() || adminPassword.isBlank()) {
            log.warn("ADMIN_USERNAME/ADMIN_PASSWORD no configurados: no se siembra ningún usuario admin.");
            return;
        }
        if (usuarioRepository.existsByUsername(adminUsername)) {
            log.info("Usuario admin '{}' ya existe, no se vuelve a crear.", adminUsername);
            return;
        }

        Usuario admin = new Usuario();
        admin.setUsername(adminUsername);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);
        admin.setHabilitado(true);
        usuarioRepository.save(admin);
        log.info("Usuario admin '{}' creado.", adminUsername);
    }
}
