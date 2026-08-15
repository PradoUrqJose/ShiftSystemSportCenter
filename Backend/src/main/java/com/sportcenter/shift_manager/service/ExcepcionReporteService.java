package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ExcepcionReporteDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.model.Feriado;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.FeriadoRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.Duration;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static java.time.DayOfWeek.MONDAY;

/** Detecta excepciones de programación sin convertirlas en veredictos legales. */
@Service
public class ExcepcionReporteService {

    // Son criterios de revisión configurables, no una jornada contractual ni
    // una liquidación: el modelo solo contiene turnos programados.
    private static final double UMBRAL_HORAS_DIARIAS_DEFAULT = 8.0;
    private static final double UMBRAL_JORNADA_EXTREMA_DEFAULT = 12.0;
    private static final int HORIZONTE_DIAS_DEFAULT = 90;
    private static final int DIAS_CONTEXTO_DESCANSO = 31;
    private static final ZoneId ZONA_NEGOCIO = ZoneId.of("America/Lima");

    private final TurnoRepository turnoRepository;
    private final FeriadoRepository feriadoRepository;

    public ExcepcionReporteService(TurnoRepository turnoRepository, FeriadoRepository feriadoRepository) {
        this.turnoRepository = turnoRepository;
        this.feriadoRepository = feriadoRepository;
    }

    public ReporteExcepcionesDTO getExcepciones(
            LocalDate desde,
            LocalDate hasta,
            Long empresaId,
            Double umbralHorasDiariasParam,
            Double umbralJornadaExtremaParam,
            Integer horizonteDiasParam
    ) {
        validarParametrosExcepciones(desde, hasta, umbralHorasDiariasParam, umbralJornadaExtremaParam, horizonteDiasParam);

        double umbralDiario = umbralHorasDiariasParam != null
                ? umbralHorasDiariasParam : UMBRAL_HORAS_DIARIAS_DEFAULT;
        double umbralExtremo = umbralJornadaExtremaParam != null
                ? umbralJornadaExtremaParam : UMBRAL_JORNADA_EXTREMA_DEFAULT;
        int horizonteDias = horizonteDiasParam != null ? horizonteDiasParam : HORIZONTE_DIAS_DEFAULT;

        LocalDate consultaDesde = desde.minusDays(DIAS_CONTEXTO_DESCANSO);
        LocalDate consultaHasta = hasta.plusDays(DIAS_CONTEXTO_DESCANSO);
        List<Turno> contexto = empresaId == null
                ? turnoRepository.findByFechaBetween(consultaDesde, consultaHasta)
                : turnoRepository.findByEmpresa_IdAndFechaBetween(empresaId, consultaDesde, consultaHasta);
        Set<LocalDate> feriados = feriadoRepository.findByFechaBetween(consultaDesde, consultaHasta).stream()
                .map(Feriado::getFecha)
                .collect(Collectors.toSet());

        List<ExcepcionReporteDTO> hallazgos = new ArrayList<>();
        List<Turno> periodo = contexto.stream()
                .filter(t -> t.getFecha() != null && !t.getFecha().isBefore(desde) && !t.getFecha().isAfter(hasta))
                .toList();

        List<Turno> sinFecha = empresaId == null
                ? turnoRepository.findByFechaIsNull()
                : turnoRepository.findByEmpresa_IdAndFechaIsNull(empresaId);
        sinFecha.stream()
                .forEach(t -> hallazgos.add(crearHallazgo(
                        "DATOS_INCOMPLETOS", Severidad.ERROR, "Turno sin fecha",
                        "El turno no tiene fecha y no puede ubicarse dentro de ningún período.",
                        List.of(t), null, null, null, null)));
        agregarProblemasPorTurno(hallazgos, periodo, feriados, horizonteDias);
        agregarProblemasDiarios(hallazgos, periodo, umbralDiario, umbralExtremo);
        agregarProblemasSemanales(hallazgos, contexto, desde, hasta);
        agregarDescansosSemanales(hallazgos, contexto, desde, hasta);

        hallazgos.sort(Comparator
                .comparingInt((ExcepcionReporteDTO e) -> ordenSeveridad(e.getSeveridad()))
                .thenComparing(ExcepcionReporteDTO::getFechaInicio, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ExcepcionReporteDTO::getNombreColaborador, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(ExcepcionReporteDTO::getCodigo));

        return ReporteExcepcionesDTO.builder()
                .desde(desde)
                .hasta(hasta)
                .umbralHorasDiarias(umbralDiario)
                .umbralJornadaExtrema(umbralExtremo)
                .horizonteDias(horizonteDias)
                .errores(contarSeveridad(hallazgos, Severidad.ERROR))
                .riesgos(contarSeveridad(hallazgos, Severidad.RIESGO))
                .advertencias(contarSeveridad(hallazgos, Severidad.ADVERTENCIA))
                .informativos(contarSeveridad(hallazgos, Severidad.INFORMACION))
                .excepciones(hallazgos)
                .build();
    }

    private void agregarProblemasPorTurno(
            List<ExcepcionReporteDTO> hallazgos,
            List<Turno> turnos,
            Set<LocalDate> feriados,
            int horizonteDias
    ) {
        LocalDate hoy = LocalDate.now(ZONA_NEGOCIO);
        LocalDate limitePlanificacion = hoy.plusDays(horizonteDias);

        for (Turno turno : turnos) {
            if (turno.getHoraEntrada() == null || turno.getHoraSalida() == null) {
                hallazgos.add(crearHallazgo(
                        "DATOS_INCOMPLETOS", Severidad.ERROR, "Horario incompleto",
                        "Falta la hora de entrada o de salida; las horas programadas no pueden calcularse.",
                        List.of(turno), turno.getFecha(), turno.getFecha(), null, null));
                continue;
            }
            if (!turno.getHoraSalida().isAfter(turno.getHoraEntrada())) {
                hallazgos.add(crearHallazgo(
                        "HORARIO_INVALIDO", Severidad.ERROR, "Horario inválido",
                        "La salida no es posterior a la entrada. El modelo actual no admite turnos que crucen medianoche.",
                        List.of(turno), turno.getFecha(), turno.getFecha(), turno.getHorasTrabajadas(), null));
                continue;
            }

            boolean deberiaSerFeriado = feriados.contains(turno.getFecha());
            if (turno.isEsFeriado() != deberiaSerFeriado) {
                hallazgos.add(crearHallazgo(
                        "FERIADO_INCONSISTENTE", Severidad.ERROR, "Marca de feriado inconsistente",
                        deberiaSerFeriado
                                ? "La fecha existe en el catálogo de feriados, pero el turno no está marcado como feriado."
                                : "El turno está marcado como feriado, pero la fecha no existe en el catálogo.",
                        List.of(turno), turno.getFecha(), turno.getFecha(), turno.getHorasTrabajadas(), null));
            }

            if (turno.getColaborador() != null && !turno.getColaborador().isHabilitado()
                    && !turno.getFecha().isBefore(hoy)) {
                hallazgos.add(crearHallazgo(
                        "COLABORADOR_DESHABILITADO", Severidad.ADVERTENCIA,
                        "Turno futuro de colaborador deshabilitado",
                        "El historial anterior a la baja no es un error; este hallazgo solo aplica a programación actual o futura.",
                        List.of(turno), turno.getFecha(), turno.getFecha(), turno.getHorasTrabajadas(), null));
            }

            if (turno.getFecha().isAfter(limitePlanificacion)) {
                hallazgos.add(crearHallazgo(
                        "FUERA_DE_HORIZONTE", Severidad.ADVERTENCIA, "Programación fuera del horizonte",
                        "El turno está a más de " + horizonteDias + " días de la fecha actual y debe confirmarse.",
                        List.of(turno), turno.getFecha(), turno.getFecha(), turno.getHorasTrabajadas(), null));
            }
        }
    }

    private void agregarProblemasDiarios(
            List<ExcepcionReporteDTO> hallazgos,
            List<Turno> turnos,
            double umbralDiario,
            double umbralExtremo
    ) {
        List<Turno> validos = turnos.stream().filter(this::tieneHorarioValido).toList();

        Map<TurnoExactoKey, List<Turno>> exactos = validos.stream()
                .collect(Collectors.groupingBy(this::keyExacta));
        exactos.values().stream().filter(lista -> lista.size() > 1).forEach(lista ->
                hallazgos.add(crearHallazgo(
                        "TURNO_DUPLICADO", Severidad.ERROR, "Turno exacto duplicado",
                        "Coinciden colaborador, fecha, horario, empresa y tienda.", lista,
                        lista.get(0).getFecha(), lista.get(0).getFecha(),
                        lista.stream().mapToDouble(Turno::getHorasTrabajadas).sum(), null)));

        Map<ColaboradorFechaKey, List<Turno>> porPersonaDia = validos.stream()
                .collect(Collectors.groupingBy(t -> new ColaboradorFechaKey(idColaborador(t), t.getFecha())));
        for (List<Turno> dia : porPersonaDia.values()) {
            Set<Turno> involucrados = new LinkedHashSet<>();
            List<Turno> ordenados = dia.stream()
                    .sorted(Comparator.comparing(Turno::getHoraEntrada).thenComparing(Turno::getHoraSalida))
                    .toList();
            for (int i = 0; i < ordenados.size(); i++) {
                for (int j = i + 1; j < ordenados.size(); j++) {
                    Turno a = ordenados.get(i);
                    Turno b = ordenados.get(j);
                    if (a.getHoraEntrada().isBefore(b.getHoraSalida())
                            && b.getHoraEntrada().isBefore(a.getHoraSalida())) {
                        involucrados.add(a);
                        involucrados.add(b);
                    }
                }
            }
            if (!involucrados.isEmpty()) {
                List<Turno> lista = List.copyOf(involucrados);
                hallazgos.add(crearHallazgo(
                        "TURNOS_SOLAPADOS", Severidad.ERROR, "Turnos solapados",
                        "El colaborador tiene horarios que se cruzan el mismo día.", lista,
                        lista.get(0).getFecha(), lista.get(0).getFecha(), null, null));
            }
        }

        Map<ColaboradorEmpresaFechaKey, List<Turno>> porRelacionDia = validos.stream()
                .collect(Collectors.groupingBy(t -> new ColaboradorEmpresaFechaKey(
                        idColaborador(t), idEmpresa(t), t.getFecha())));
        for (List<Turno> dia : porRelacionDia.values()) {
            double horas = dia.stream().mapToDouble(Turno::getHorasTrabajadas).sum();
            LocalDate fecha = dia.get(0).getFecha();
            if (horas > umbralDiario) {
                String detalle = "Supera el umbral diario de " + formatearNumero(umbralDiario)
                        + " h y debe conciliarse con asistencia, régimen y pago/compensación de sobretiempo.";
                if (horas > umbralExtremo) {
                    detalle += " También supera el umbral operativo extremo de "
                            + formatearNumero(umbralExtremo) + " h.";
                }
                hallazgos.add(crearHallazgo(
                        "JORNADA_SOBRE_UMBRAL", Severidad.RIESGO, "Jornada programada sobre el umbral",
                        detalle, dia, fecha, fecha, horas, umbralDiario));
            }
            if (dia.size() > 1) {
                hallazgos.add(crearHallazgo(
                        "TURNO_PARTIDO", Severidad.INFORMACION, "Turno partido",
                        "Hay más de un turno programado para la misma relación laboral en este día.",
                        dia, fecha, fecha, horas, null));
            }
        }
    }

    private void agregarProblemasSemanales(
            List<ExcepcionReporteDTO> hallazgos,
            List<Turno> contexto,
            LocalDate desde,
            LocalDate hasta
    ) {
        Map<ColaboradorEmpresaSemanaKey, List<Turno>> semanas = contexto.stream()
                .filter(this::tieneHorarioValido)
                .collect(Collectors.groupingBy(t -> new ColaboradorEmpresaSemanaKey(
                        idColaborador(t), idEmpresa(t), inicioSemana(t.getFecha()))));

        for (Map.Entry<ColaboradorEmpresaSemanaKey, List<Turno>> entry : semanas.entrySet()) {
            LocalDate inicio = entry.getKey().semana();
            LocalDate fin = inicio.plusDays(6);
            if (fin.isBefore(desde) || inicio.isAfter(hasta)) continue;

            List<Turno> turnos = entry.getValue();
            double horas = turnos.stream().mapToDouble(Turno::getHorasTrabajadas).sum();
            if (horas > 48) {
                hallazgos.add(crearHallazgo(
                        "SEMANA_SOBRE_48_HORAS", Severidad.RIESGO,
                        "Semana programada sobre 48 horas",
                        "Total de la semana calendario completa. Debe conciliarse con asistencia, jornada aplicable y sobretiempo.",
                        turnos, inicio, fin, horas, 48.0));
            }
        }
    }

    private void agregarDescansosSemanales(
            List<ExcepcionReporteDTO> hallazgos,
            List<Turno> contexto,
            LocalDate desde,
            LocalDate hasta
    ) {
        Map<ColaboradorEmpresaFechaKey, List<Turno>> dias = contexto.stream()
                .filter(this::tieneHorarioValido)
                .collect(Collectors.groupingBy(t -> new ColaboradorEmpresaFechaKey(
                        idColaborador(t), idEmpresa(t), t.getFecha())));

        Map<ColaboradorEmpresaKey, List<DiaProgramado>> porRelacion = new HashMap<>();
        for (Map.Entry<ColaboradorEmpresaFechaKey, List<Turno>> entry : dias.entrySet()) {
            List<Turno> turnosDia = entry.getValue();
            LocalDate fecha = entry.getKey().fecha();
            LocalTime primeraEntrada = turnosDia.stream().map(Turno::getHoraEntrada).min(LocalTime::compareTo).orElseThrow();
            LocalTime ultimaSalida = turnosDia.stream().map(Turno::getHoraSalida).max(LocalTime::compareTo).orElseThrow();
            DiaProgramado dia = new DiaProgramado(
                    fecha,
                    LocalDateTime.of(fecha, primeraEntrada),
                    LocalDateTime.of(fecha, ultimaSalida),
                    turnosDia
            );
            porRelacion.computeIfAbsent(
                    new ColaboradorEmpresaKey(entry.getKey().colaboradorId(), entry.getKey().empresaId()),
                    ignored -> new ArrayList<>()).add(dia);
        }

        for (List<DiaProgramado> diasRelacion : porRelacion.values()) {
            diasRelacion.sort(Comparator.comparing(DiaProgramado::fecha));
            List<DiaProgramado> racha = new ArrayList<>();
            for (DiaProgramado dia : diasRelacion) {
                if (!racha.isEmpty()) {
                    DiaProgramado anterior = racha.get(racha.size() - 1);
                    long horasDescanso = Duration.between(anterior.fin(), dia.inicio()).toHours();
                    if (horasDescanso >= 24) {
                        agregarRachaSinDescanso(hallazgos, racha, desde, hasta);
                        racha = new ArrayList<>();
                    }
                }
                racha.add(dia);
            }
            agregarRachaSinDescanso(hallazgos, racha, desde, hasta);
        }
    }

    private void agregarRachaSinDescanso(
            List<ExcepcionReporteDTO> hallazgos,
            List<DiaProgramado> racha,
            LocalDate desde,
            LocalDate hasta
    ) {
        if (racha.size() < 7) return;
        LocalDate inicio = racha.get(0).fecha();
        LocalDate fin = racha.get(racha.size() - 1).fecha();
        if (fin.isBefore(desde) || inicio.isAfter(hasta)) return;

        List<Turno> turnos = racha.stream().flatMap(d -> d.turnos().stream()).toList();
        double horas = turnos.stream().mapToDouble(Turno::getHorasTrabajadas).sum();
        hallazgos.add(crearHallazgo(
                "SIN_DESCANSO_24_HORAS", Severidad.RIESGO,
                "Posible falta de descanso semanal",
                "Se programaron " + racha.size()
                        + " días de trabajo sin observar una brecha de 24 horas consecutivas. Debe contrastarse con asistencia y descansos reales.",
                turnos, inicio, fin, horas, 24.0));
    }

    private ExcepcionReporteDTO crearHallazgo(
            String codigo,
            Severidad severidad,
            String titulo,
            String detalle,
            List<Turno> turnos,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Double horas,
            Double umbral
    ) {
        Turno referencia = turnos.isEmpty() ? null : turnos.get(0);
        Set<Long> empresaIds = turnos.stream().map(this::idEmpresa).collect(Collectors.toSet());
        String nombreEmpresa = empresaIds.size() > 1
                ? "Varias empresas"
                : referencia != null && referencia.getEmpresa() != null ? referencia.getEmpresa().getNombre() : "Sin empresa";
        Long empresaId = empresaIds.size() == 1 ? empresaIds.iterator().next() : null;

        return ExcepcionReporteDTO.builder()
                .codigo(codigo)
                .severidad(severidad.name())
                .titulo(titulo)
                .detalle(detalle)
                .colaboradorId(referencia != null ? idColaborador(referencia) : null)
                .nombreColaborador(referencia != null ? nombreColaborador(referencia) : "Sin colaborador")
                .dni(referencia != null && referencia.getColaborador() != null ? referencia.getColaborador().getDni() : null)
                .empresaId(empresaId)
                .nombreEmpresa(nombreEmpresa)
                .fechaInicio(fechaInicio)
                .fechaFin(fechaFin)
                .horasProgramadas(horas)
                .umbralHoras(umbral)
                .cantidadTurnos(turnos.size())
                .turnoIds(turnos.stream().map(Turno::getId).filter(Objects::nonNull).sorted().toList())
                .build();
    }

    private boolean tieneHorarioValido(Turno turno) {
        return turno.getFecha() != null
                && turno.getHoraEntrada() != null
                && turno.getHoraSalida() != null
                && turno.getHoraSalida().isAfter(turno.getHoraEntrada());
    }

    private TurnoExactoKey keyExacta(Turno turno) {
        return new TurnoExactoKey(
                idColaborador(turno), turno.getFecha(), turno.getHoraEntrada(), turno.getHoraSalida(),
                idEmpresa(turno), turno.getTienda() != null ? turno.getTienda().getId() : null);
    }

    private Long idColaborador(Turno turno) {
        return turno.getColaborador() != null ? turno.getColaborador().getId() : null;
    }

    private Long idEmpresa(Turno turno) {
        return turno.getEmpresa() != null ? turno.getEmpresa().getId() : null;
    }

    private String nombreColaborador(Turno turno) {
        if (turno.getColaborador() == null) return "Sin colaborador";
        return (turno.getColaborador().getNombre() + " " + turno.getColaborador().getApellido()).trim();
    }

    private LocalDate inicioSemana(LocalDate fecha) {
        return fecha.with(TemporalAdjusters.previousOrSame(MONDAY));
    }

    private String formatearNumero(double valor) {
        return valor == Math.rint(valor) ? String.valueOf((long) valor) : String.valueOf(valor);
    }

    private int contarSeveridad(List<ExcepcionReporteDTO> hallazgos, Severidad severidad) {
        return (int) hallazgos.stream().filter(e -> severidad.name().equals(e.getSeveridad())).count();
    }

    private int ordenSeveridad(String severidad) {
        return switch (Severidad.valueOf(severidad)) {
            case ERROR -> 0;
            case RIESGO -> 1;
            case ADVERTENCIA -> 2;
            case INFORMACION -> 3;
        };
    }

    private void validarParametrosExcepciones(
            LocalDate desde,
            LocalDate hasta,
            Double umbralHorasDiarias,
            Double umbralJornadaExtrema,
            Integer horizonteDias
    ) {
        if (desde == null || hasta == null) {
            throw new IllegalArgumentException("Las fechas desde y hasta son obligatorias");
        }
        if (desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha desde no puede ser posterior a la fecha hasta");
        }
        if (desde.plusYears(2).isBefore(hasta)) {
            throw new IllegalArgumentException("El rango del reporte no puede superar dos años");
        }
        if (umbralHorasDiarias != null && (!Double.isFinite(umbralHorasDiarias) || umbralHorasDiarias <= 0)) {
            throw new IllegalArgumentException("El umbral diario debe ser mayor que cero");
        }
        if (umbralJornadaExtrema != null
                && (!Double.isFinite(umbralJornadaExtrema) || umbralJornadaExtrema <= 0)) {
            throw new IllegalArgumentException("El umbral de jornada extrema debe ser mayor que cero");
        }
        double diario = umbralHorasDiarias != null ? umbralHorasDiarias : UMBRAL_HORAS_DIARIAS_DEFAULT;
        double extremo = umbralJornadaExtrema != null ? umbralJornadaExtrema : UMBRAL_JORNADA_EXTREMA_DEFAULT;
        if (extremo <= diario) {
            throw new IllegalArgumentException("El umbral de jornada extrema debe ser mayor que el umbral diario");
        }
        if (horizonteDias != null && (horizonteDias < 1 || horizonteDias > 365)) {
            throw new IllegalArgumentException("El horizonte debe estar entre 1 y 365 días");
        }
    }

    private enum Severidad { ERROR, RIESGO, ADVERTENCIA, INFORMACION }

    private record ColaboradorEmpresaKey(Long colaboradorId, Long empresaId) {}
    private record ColaboradorFechaKey(Long colaboradorId, LocalDate fecha) {}
    private record ColaboradorEmpresaFechaKey(Long colaboradorId, Long empresaId, LocalDate fecha) {}
    private record ColaboradorEmpresaSemanaKey(Long colaboradorId, Long empresaId, LocalDate semana) {}
    private record TurnoExactoKey(
            Long colaboradorId,
            LocalDate fecha,
            LocalTime entrada,
            LocalTime salida,
            Long empresaId,
            Long tiendaId
    ) {}
    private record DiaProgramado(
            LocalDate fecha,
            LocalDateTime inicio,
            LocalDateTime fin,
            List<Turno> turnos
    ) {}
}
