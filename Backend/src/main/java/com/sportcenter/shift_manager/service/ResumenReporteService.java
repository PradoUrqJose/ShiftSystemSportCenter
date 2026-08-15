package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ExcepcionReporteDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.dto.ResumenReporteDTO;
import com.sportcenter.shift_manager.dto.ResumenSemanaDTO;
import com.sportcenter.shift_manager.dto.ResumenTiendaDTO;
import com.sportcenter.shift_manager.repository.TurnoDiarioAgregado;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import com.sportcenter.shift_manager.repository.TurnoTiendaAgregado;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Compone la portada de Reportes a partir de agregados ya validados. No crea
 * una segunda definición de excepciones ni vuelve a calcular horas desde los
 * turnos: reutiliza las mismas fuentes que preliquidación y calidad de datos.
 */
@Service
public class ResumenReporteService {

    private static final double UMBRAL_DIARIO_DEFAULT = 8.0;
    private static final double UMBRAL_EXTREMO_DEFAULT = 12.0;
    private static final int HORIZONTE_DEFAULT = 90;
    private static final int LIMITE_ATENCION = 6;

    private final TurnoRepository turnoRepository;
    private final ExcepcionReporteService excepcionReporteService;

    public ResumenReporteService(
            TurnoRepository turnoRepository,
            ExcepcionReporteService excepcionReporteService
    ) {
        this.turnoRepository = turnoRepository;
        this.excepcionReporteService = excepcionReporteService;
    }

    public ResumenReporteDTO getResumen(
            LocalDate desde,
            LocalDate hasta,
            Long empresaId,
            Double umbralHorasDiarias,
            Double umbralJornadaExtrema,
            Integer horizonteDias
    ) {
        validarRango(desde, hasta);

        ReporteExcepcionesDTO excepciones = excepcionReporteService.getExcepciones(
                desde, hasta, empresaId, umbralHorasDiarias, umbralJornadaExtrema, horizonteDias);
        List<TurnoDiarioAgregado> diarios = turnoRepository.sumarizarPorColaboradorYDia(desde, hasta, empresaId);
        List<TurnoTiendaAgregado> porTienda = turnoRepository.sumarizarPorColaboradorYTienda(desde, hasta, empresaId);

        double totalHoras = diarios.stream().mapToDouble(this::horas).sum();
        double horasFeriado = diarios.stream()
                .filter(d -> Boolean.TRUE.equals(d.getEsFeriado()))
                .mapToDouble(this::horas)
                .sum();
        int colaboradores = (int) diarios.stream()
                .map(TurnoDiarioAgregado::getColaboradorId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        int colaboradoresExcepcionales = (int) excepciones.getExcepciones().stream()
                .filter(e -> "RIESGO".equals(e.getSeveridad()))
                .map(ExcepcionReporteDTO::getColaboradorId)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        List<ExcepcionReporteDTO> atencion = excepciones.getExcepciones().stream()
                .filter(e -> !"INFORMACION".equals(e.getSeveridad()))
                .limit(LIMITE_ATENCION)
                .toList();

        return ResumenReporteDTO.builder()
                .desde(desde)
                .hasta(hasta)
                .empresaId(empresaId)
                .umbralHorasDiarias(valorO(excepciones.getUmbralHorasDiarias(), UMBRAL_DIARIO_DEFAULT))
                .umbralJornadaExtrema(valorO(excepciones.getUmbralJornadaExtrema(), UMBRAL_EXTREMO_DEFAULT))
                .horizonteDias(excepciones.getHorizonteDias() > 0 ? excepciones.getHorizonteDias() : HORIZONTE_DEFAULT)
                .totalHorasProgramadas(totalHoras)
                .horasEnFeriado(horasFeriado)
                .colaboradoresProgramados(colaboradores)
                .colaboradoresConCargaExcepcional(colaboradoresExcepcionales)
                .erroresDatos(excepciones.getErrores())
                .hallazgosPorConciliar(excepciones.getRiesgos() + excepciones.getAdvertencias())
                .semanas(armarSemanas(diarios, desde, hasta))
                .tiendas(armarTiendas(porTienda, totalHoras))
                .requiereAtencion(atencion)
                .build();
    }

    private List<ResumenSemanaDTO> armarSemanas(
            List<TurnoDiarioAgregado> diarios,
            LocalDate desde,
            LocalDate hasta
    ) {
        Map<LocalDate, AcumuladoSemana> acumulados = new HashMap<>();
        for (TurnoDiarioAgregado dia : diarios) {
            if (dia.getFecha() == null) continue;
            LocalDate inicioSemana = dia.getFecha().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            AcumuladoSemana acumulado = acumulados.computeIfAbsent(inicioSemana, ignored -> new AcumuladoSemana());
            if (Boolean.TRUE.equals(dia.getEsFeriado())) {
                acumulado.feriado += horas(dia);
            } else {
                acumulado.regular += horas(dia);
            }
        }

        List<ResumenSemanaDTO> semanas = new ArrayList<>();
        LocalDate cursor = desde.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate ultimaSemana = hasta.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        while (!cursor.isAfter(ultimaSemana)) {
            AcumuladoSemana acumulado = acumulados.getOrDefault(cursor, new AcumuladoSemana());
            semanas.add(ResumenSemanaDTO.builder()
                    .inicio(cursor.isBefore(desde) ? desde : cursor)
                    .fin(cursor.plusDays(6).isAfter(hasta) ? hasta : cursor.plusDays(6))
                    .horasRegulares(acumulado.regular)
                    .horasEnFeriado(acumulado.feriado)
                    .build());
            cursor = cursor.plusWeeks(1);
        }
        return semanas;
    }

    private List<ResumenTiendaDTO> armarTiendas(List<TurnoTiendaAgregado> filas, double totalHoras) {
        Map<TiendaKey, Double> acumulados = new HashMap<>();
        for (TurnoTiendaAgregado fila : filas) {
            TiendaKey key = new TiendaKey(fila.getTiendaId(), fila.getNombreTienda());
            acumulados.merge(key, fila.getHoras() != null ? fila.getHoras() : 0.0, Double::sum);
        }

        return acumulados.entrySet().stream()
                .map(entry -> ResumenTiendaDTO.builder()
                        .tiendaId(entry.getKey().id())
                        .nombreTienda(entry.getKey().nombre())
                        .horas(entry.getValue())
                        .porcentaje(totalHoras > 0 ? entry.getValue() * 100.0 / totalHoras : 0.0)
                        .build())
                .sorted(Comparator.comparingDouble(ResumenTiendaDTO::getHoras).reversed()
                        .thenComparing(ResumenTiendaDTO::getNombreTienda, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private double horas(TurnoDiarioAgregado dia) {
        return (dia.getMinutosNetos() != null ? dia.getMinutosNetos() : 0.0) / 60.0;
    }

    private double valorO(double valor, double fallback) {
        return valor > 0 ? valor : fallback;
    }

    private void validarRango(LocalDate desde, LocalDate hasta) {
        if (desde == null || hasta == null) {
            throw new IllegalArgumentException("Debe indicar las fechas desde y hasta");
        }
        if (desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha desde no puede ser posterior a la fecha hasta");
        }
    }

    private static final class AcumuladoSemana {
        private double regular;
        private double feriado;
    }

    private record TiendaKey(Long id, String nombre) {}
}
