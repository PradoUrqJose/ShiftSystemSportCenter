package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "empresa")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Empresa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String nombre;

    @Column(unique = true, nullable = false, length = 11)
    @Pattern(regexp = "\\d{11}", message = "El RUC debe tener 11 dígitos")
    private String ruc;

    // El número de empleados ya no se calcula desde acá (recorrer esta colección
    // completa para contar es caro y, con open-in-view=false, se rompe si se
    // toca fuera de una transacción). EmpresaService.convertToDTO usa
    // colaboradorRepository.countByEmpresaId() en su lugar.
    @OneToMany(mappedBy = "empresa", cascade = CascadeType.PERSIST, fetch = FetchType.LAZY)
    @JsonIgnoreProperties("empresa")
    private List<Colaborador> colaboradores;

    @Column(nullable = false)
    private boolean habilitada = true; // Nueva propiedad
}