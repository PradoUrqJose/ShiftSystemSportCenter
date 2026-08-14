package com.sportcenter.shift_manager.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "turno",
        indexes = {
                @Index(name = "idx_turno_fecha", columnList = "fecha"),
                @Index(name = "idx_turno_colaborador_id", columnList = "colaborador_id"),
                @Index(name = "idx_turno_tienda_id", columnList = "tienda_id")
        }
)
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

    // Ventana de almuerzo: si el turno entra antes de las 12:01 y sale después de
    // las 14:00, se asume que el colaborador almorzó y se descuentan estos minutos.
    // Única fuente de verdad para este cálculo (antes estaba duplicado en TurnoService).
    private static final LocalTime INICIO_VENTANA_ALMUERZO = LocalTime.of(12, 1);
    private static final LocalTime FIN_VENTANA_ALMUERZO = LocalTime.of(14, 0);
    private static final int MINUTOS_ALMUERZO = 45;

    public boolean isTomoAlmuerzo() {
        return horaEntrada != null && horaSalida != null
                && horaEntrada.isBefore(INICIO_VENTANA_ALMUERZO)
                && horaSalida.isAfter(FIN_VENTANA_ALMUERZO);
    }

    public double getHorasTrabajadas() {
        if (horaEntrada == null || horaSalida == null) {
            return 0;
        }
        long minutosTrabajados = java.time.Duration.between(horaEntrada, horaSalida).toMinutes();
        if (isTomoAlmuerzo()) {
            minutosTrabajados -= MINUTOS_ALMUERZO;
        }
        return minutosTrabajados / 60.0;
    }

    private boolean esFeriado;
}
