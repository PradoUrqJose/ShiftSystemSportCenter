package com.sportcenter.shift_manager.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Aplica a todas las rutas de la API
                .allowedOrigins(
                        "http://localhost:4200" // Desarrollo
                        //"https://tu-app.vercel.app" // Producción (cambia por tu dominio real de Vercel)
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Métodos permitidos
                .allowedHeaders("*") // Todos los encabezados
                .allowCredentials(true) // Permitir cookies o autenticación si lo necesitas
                .maxAge(3600); // Tiempo de cache de preflight (1 hora)
    }
}