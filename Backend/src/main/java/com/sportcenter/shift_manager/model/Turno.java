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
                @Index(name = "idx_turno_tienda_id", columnList = "tienda_id"),
                // Compuesto: soporta el rango temporal y la agrupación por
                // colaborador de los reportes agregados.
                @Index(name = "idx_turno_colaborador_fecha", columnList = "colaborador_id, fecha")
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

    // Si el colaborador tomó almuerzo en este turno (se descuentan
    // MINUTOS_ALMUERZO de las horas trabajadas). Antes esto se recalculaba
    // en cada consulta a partir del horario (ventana 12:01-14:00) y no era
    // editable; ahora se persiste, para que el administrador pueda
    // desactivarlo a mano en turnos donde no aplica (ej. un turno partido
    // con un bloque que cruza el mediodía pero sin pausa real).
    // calcularAlmuerzoPorDefecto() sigue siendo la regla automática, usada
    // solo para fijar el valor por defecto al crear/editar (ver
    // TurnoService.aplicarDatosTurno) — no para calcular horasTrabajadas.
    //
    // Esta misma regla por defecto está duplicada a mano en SQL nativo en
    // TurnoRepository.sumarizarPorColaboradorYDia/sumarizarPorColaboradorYTienda
    // (backfill de V8__add_turno_tomo_almuerzo.sql). Si estas constantes
    // cambian, no hace falta tocar esas queries — ya leen la columna
    // persistida — pero sí revisar el backfill si se re-ejecuta a mano.
    private static final LocalTime INICIO_VENTANA_ALMUERZO = LocalTime.of(12, 1);
    private static final LocalTime FIN_VENTANA_ALMUERZO = LocalTime.of(14, 0);
    private static final int MINUTOS_ALMUERZO = 45;

    private boolean tomoAlmuerzo;

    public static boolean calcularAlmuerzoPorDefecto(LocalTime horaEntrada, LocalTime horaSalida) {
        return horaEntrada != null && horaSalida != null
                && horaEntrada.isBefore(INICIO_VENTANA_ALMUERZO)
                && horaSalida.isAfter(FIN_VENTANA_ALMUERZO);
    }

    public double getHorasTrabajadas() {
        if (horaEntrada == null || horaSalida == null) {
            return 0;
        }
        long minutosTrabajados = java.time.Duration.between(horaEntrada, horaSalida).toMinutes();
        if (tomoAlmuerzo) {
            minutosTrabajados -= MINUTOS_ALMUERZO;
        }
        return minutosTrabajados / 60.0;
    }

    private boolean esFeriado;
}
