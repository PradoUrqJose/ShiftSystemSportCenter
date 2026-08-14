package com.sportcenter.shift_manager.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Punto central de la autenticación Y autorización: qué rutas son
 * públicas, qué rol requiere cada una, cómo se verifica la identidad (JWT,
 * no sesión), y qué pasa cuando falla.
 *
 * Todas las reglas de rol viven acá (por URL/verbo), no en los
 * controllers: así queda todo el mapa de permisos en un solo archivo,
 * auditable de una mirada, sin sembrar @PreAuthorize por los 8
 * controllers existentes. Por defecto (anyRequest) todo es ADMIN — fail
 * closed: un endpoint nuevo que alguien agregue mañana sin tocar este
 * archivo queda protegido automáticamente en vez de quedar abierto.
 *
 * Hoy el rol COLABORADOR casi no tiene nada habilitado más allá de los
 * catálogos de lectura (tiendas/puestos/feriados): no existe vínculo
 * entre Usuario (cuenta de login) y Colaborador (empleado, ver
 * Usuario.java), así que no hay forma de verificar "son mis propios
 * turnos" — abrir por ejemplo GET /turnos/{colaboradorId} a cualquier
 * autenticado dejaría a un colaborador ver los turnos de cualquier otro.
 * Cuando exista ese vínculo (probablemente en el rebuild v2) vale la pena
 * revisar esto de nuevo.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final AuthEntryPointJwt authEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(JwtService jwtService, AuthEntryPointJwt authEntryPoint, CustomAccessDeniedHandler accessDeniedHandler) {
        this.jwtService = jwtService;
        this.authEntryPoint = authEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Reemplaza a CorsConfig.java (WebMvcConfigurer no aplica acá, ver más abajo).
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Sin cookies de sesión no hay CSRF que mitigar: el JWT va en un
                // header que un sitio de terceros no puede adjuntar solo.
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/**").hasRole("ADMIN")
                        .requestMatchers("/swagger-ui/**", "/api-docs/**").hasRole("ADMIN")
                        // Catálogos de solo lectura sin PII: sirven para cualquier
                        // usuario autenticado, incluido un futuro colaborador viendo
                        // su propio calendario (necesita saber nombres de tienda,
                        // puesto y qué días son feriado).
                        .requestMatchers(HttpMethod.GET, "/api/tiendas/**", "/api/puestos/**", "/api/feriados/**").authenticated()
                        // Todo lo demás (alta/edición/borrado de cualquier recurso,
                        // y toda lectura que exponga datos de otros colaboradores o
                        // reportes) queda para ADMIN. Ver el porqué en el javadoc de
                        // la clase.
                        .anyRequest().hasRole("ADMIN")
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                // Nuestro filtro corre ANTES del de Spring, así la request ya
                // llega "autenticada" (o no) cuando Spring evalúa las reglas de arriba.
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Reemplaza al viejo CorsConfig (WebMvcConfigurer): Spring Security
     * intercepta las requests antes que Spring MVC, así que el CORS de MVC
     * nunca llega a aplicarse. Mismos orígenes/reglas que tenía antes.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://localhost:5000",
                "https://sportcenter-turnos.vercel.app"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(CustomUserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(uds);
        provider.setPasswordEncoder(encoder);
        return provider;
    }
}
