package com.sportcenter.shift_manager.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("dev")
public class DotenvConfig {
    public DotenvConfig() {
        try {
            Dotenv dotenv = Dotenv.configure()
                    .directory(".")
                    .filename(".env")
                    .ignoreIfMissing() // Ignora si .env no existe
                    .load();
            if (dotenv != null) {
                dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
            }
        } catch (Exception e) {
            // Loguear el error si es necesario, pero no fallar
            System.out.println("No se pudo cargar .env: " + e.getMessage());
        }
    }
}