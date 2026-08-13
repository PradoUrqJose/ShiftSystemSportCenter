package com.sportcenter.shift_manager.security;

import com.sportcenter.shift_manager.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Optional;

/**
 * Genera y valida los JWT. Un token firmado con este mismo secreto es la
 * única prueba de identidad que pedimos — no hay sesión en el servidor,
 * así que si el secreto se filtra, cualquiera puede fabricar tokens válidos.
 * Por eso vive solo en variables de entorno (JWT_SECRET), nunca en código.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:28800000}") long expirationMs) {
        // HMAC-SHA: la misma key firma y verifica. Keys.hmacShaKeyFor exige un
        // mínimo de bits según el algoritmo; con un secreto corto esto falla
        // fuerte al arrancar en vez de generar tokens débiles en silencio.
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    public String generateToken(Usuario usuario) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(usuario.getUsername())
                .claim("role", usuario.getRole().name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    /** Vacío si el token es inválido, está corrupto, o expiró. */
    public Optional<Claims> parseClaims(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
