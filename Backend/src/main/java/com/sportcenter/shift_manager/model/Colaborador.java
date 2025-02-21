package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Colaborador {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;
    private String apellido; // Nuevo campo
    @Column(unique = true, nullable = false)
    private String dni;
    private String telefono; // Nuevo campo
    @Column(unique = true, nullable = true)
    private String email;    // Nuevo campo

    // Nuevo campo para la URL de la foto
    private String fotoUrl;  // Nuevo campo

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "empresa_id", nullable = true)
    @JsonIgnoreProperties("colaboradores")
    private Empresa empresa;

    // Getter y Setter para fotoUrl
    public String getFotoUrl() {
        return fotoUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.fotoUrl = fotoUrl;
    }

    @Column(nullable = false)
    private boolean habilitado = true; // Nueva propiedad
}
