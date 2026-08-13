package com.sportcenter.shift_manager.security;

import com.sportcenter.shift_manager.model.Usuario;
import com.sportcenter.shift_manager.repository.UsuarioRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Traduce nuestro Usuario (modelo de dominio) al UserDetails que Spring
 * Security entiende. El prefijo "ROLE_" es una convención de Spring: sin
 * él, hasRole("ADMIN") en SecurityConfig nunca va a matchear.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));

        return User.builder()
                .username(usuario.getUsername())
                .password(usuario.getPassword())
                .disabled(!usuario.isHabilitado())
                .authorities(new SimpleGrantedAuthority("ROLE_" + usuario.getRole().name()))
                .build();
    }
}
