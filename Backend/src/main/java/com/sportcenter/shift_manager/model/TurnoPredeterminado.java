package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

// Plantilla de horario para el modal de turnos (ver turno-modal.component.ts,
// sección "Plantillas rápidas"). Sin relación con Tienda ni con Turno a
// propósito: es solo un atajo para rellenar el formulario, no queda ninguna
// referencia a la plantilla usada en el turno que termina creándose.
@Entity
@Table(name = "turno_predeterminado")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TurnoPredeterminado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hora_entrada", nullable = false)
    private LocalTime horaEntrada;

    @Column(name = "hora_salida", nullable = false)
    private LocalTime horaSalida;
}
