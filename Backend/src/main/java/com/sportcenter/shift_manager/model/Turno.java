package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Turno {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colaborador_id", nullable = false)
    private Colaborador colaborador;

    private LocalDate fecha;
    private LocalTime horaEntrada;
    private LocalTime horaSalida;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tienda_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Tienda tienda;

    @Transient
    private double horasTrabajadas;

    public double getHorasTrabajadas() {
        if (horaEntrada != null && horaSalida != null) {
            long minutosTrabajados = java.time.Duration.between(horaEntrada, horaSalida).toMinutes();
            if (horaEntrada.isBefore(LocalTime.of(12, 1)) && horaSalida.isAfter(LocalTime.of(13, 0))) {
                minutosTrabajados -= 45;
            }
            return minutosTrabajados / 60.0;
        }
        return 0;
    }
}
