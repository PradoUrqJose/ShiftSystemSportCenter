package com.sportcenter.shift_manager.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("dev")
public class DotenvConfig {
    public DotenvConfig() {
        Dotenv dotenv = Dotenv.configure()
                .directory(".") // Apunta a la carpeta Backend/
                .filename(".env")       // Nombre del archivo
                .load();
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
    }
}