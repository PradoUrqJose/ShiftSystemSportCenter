package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ProgramacionContableDTO;
import com.sportcenter.shift_manager.dto.ResumenProgramacionContableDTO;
import com.sportcenter.shift_manager.dto.TurnoProgramacionContableDTO;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ProgramacionContableService {

    private static final double UMBRAL_DIARIO_DEFAULT = 8.0;

    private final TurnoRepository turnoRepository;

    public ProgramacionContableService(TurnoRepository turnoRepository) {
        this.turnoRepository = turnoRepository;
    }

    public ProgramacionContableDTO getProgramacion(
            LocalDate desde,
            LocalDate hasta,
            Long empresaId,
            List<Long> colaboradores,
            Double umbralHorasDiariasParam
    ) {
        validar(desde, hasta, empresaId, umbralHorasDiariasParam);
        double umbral = umbralHorasDiariasParam != null ? umbralHorasDiariasParam : UMBRAL_DIARIO_DEFAULT;
        List<Long> colaboradorIds = colaboradores == null
                ? List.of()
                : colaboradores.stream().filter(Objects::nonNull).distinct().toList();

        List<Turno> turnos = buscarTurnos(desde, hasta, empresaId, colaboradorIds).stream()
                .sorted(Comparator
                        .comparing((Turno t) -> t.getColaborador().getApellido(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(t -> t.getColaborador().getNombre(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Turno::getFecha)
                        .thenComparing(Turno::getHoraEntrada, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Turno::getId))
                .toList();

        Map<ColaboradorDiaKey, Long> turnosPorDia = turnos.stream().collect(
                java.util.stream.Collectors.groupingBy(this::keyDia, java.util.stream.Collectors.counting()));
        List<TurnoProgramacionContableDTO> detalle = turnos.stream()
                .map(turno -> armarDetalle(turno, turnosPorDia.getOrDefault(keyDia(turno), 0L) > 1))
                .toList();
        List<ResumenProgramacionContableDTO> resumen = armarResumen(turnos, turnosPorDia, umbral);

        return ProgramacionContableDTO.builder()
                .desde(desde)
                .hasta(hasta)
                .empresaId(empresaId)
                .umbralHorasDiarias(umbral)
                .colaboradoresIncluidos((int) detalle.stream()
                        .map(TurnoProgramacionContableDTO::getColaboradorId).distinct().count())
                .turnosIncluidos(detalle.size())
                .totalHorasProgramadas(detalle.stream().mapToDouble(TurnoProgramacionContableDTO::getHorasProgramadas).sum())
                .totalHorasEnFeriado(detalle.stream().filter(TurnoProgramacionContableDTO::isFeriado)
                        .mapToDouble(TurnoProgramacionContableDTO::getHorasProgramadas).sum())
                .resumen(resumen)
                .turnos(detalle)
                .build();
    }

    private List<Turno> buscarTurnos(
            LocalDate desde,
            LocalDate hasta,
            Long empresaId,
            List<Long> colaboradores
    ) {
        if (colaboradores.isEmpty()) {
            return empresaId == null
                    ? turnoRepository.findByFechaBetween(desde, hasta)
                    : turnoRepository.findByEmpresa_IdAndFechaBetween(empresaId, desde, hasta);
        }
        return empresaId == null
                ? turnoRepository.findByColaborador_IdInAndFechaBetween(colaboradores, desde, hasta)
                : turnoRepository.findByColaborador_IdInAndEmpresa_IdAndFechaBetween(
                        colaboradores, empresaId, desde, hasta);
    }

    private List<ResumenProgramacionContableDTO> armarResumen(
            List<Turno> turnos,
            Map<ColaboradorDiaKey, Long> turnosPorDia,
            double umbral
    ) {
        Map<RelacionKey, List<Turno>> porRelacion = turnos.stream().collect(
                java.util.stream.Collectors.groupingBy(this::keyRelacion, LinkedHashMap::new,
                        java.util.stream.Collectors.toList()));

        return porRelacion.values().stream().map(relacion -> {
            Turno referencia = relacion.get(0);
            Map<LocalDate, List<Turno>> porDia = relacion.stream().collect(
                    java.util.stream.Collectors.groupingBy(Turno::getFecha));
            double total = relacion.stream().mapToDouble(Turno::getHorasTrabajadas).sum();
            double feriado = relacion.stream().filter(Turno::isEsFeriado).mapToDouble(Turno::getHorasTrabajadas).sum();
            double sobreUmbral = porDia.values().stream()
                    .mapToDouble(dia -> Math.max(0, dia.stream().mapToDouble(Turno::getHorasTrabajadas).sum() - umbral))
                    .sum();

            return ResumenProgramacionContableDTO.builder()
                    .colaboradorId(referencia.getColaborador().getId())
                    .dni(referencia.getColaborador().getDni())
                    .nombre(referencia.getColaborador().getNombre())
                    .apellido(referencia.getColaborador().getApellido())
                    .empresaId(referencia.getEmpresa().getId())
                    .nombreEmpresa(referencia.getEmpresa().getNombre())
                    .rucEmpresa(referencia.getEmpresa().getRuc())
                    .diasProgramados(porDia.size())
                    .cantidadTurnos(relacion.size())
                    .horasRegulares(total - feriado)
                    .horasEnFeriado(feriado)
                    .totalHorasProgramadas(total)
                    .horasSobreUmbralDiario(sobreUmbral)
                    .diasConTurnoPartido((int) porDia.keySet().stream()
                            .filter(fecha -> turnosPorDia.getOrDefault(
                                    new ColaboradorDiaKey(referencia.getColaborador().getId(), fecha), 0L) > 1)
                            .count())
                    .build();
        }).toList();
    }

    private TurnoProgramacionContableDTO armarDetalle(Turno turno, boolean partido) {
        return TurnoProgramacionContableDTO.builder()
                .turnoId(turno.getId())
                .colaboradorId(turno.getColaborador().getId())
                .dni(turno.getColaborador().getDni())
                .nombre(turno.getColaborador().getNombre())
                .apellido(turno.getColaborador().getApellido())
                .empresaId(turno.getEmpresa().getId())
                .nombreEmpresa(turno.getEmpresa().getNombre())
                .rucEmpresa(turno.getEmpresa().getRuc())
                .tiendaId(turno.getTienda().getId())
                .nombreTienda(turno.getTienda().getNombre())
                .fecha(turno.getFecha())
                .horaEntrada(turno.getHoraEntrada())
                .horaSalida(turno.getHoraSalida())
                .horasProgramadas(turno.getHorasTrabajadas())
                .descuentoAlmuerzo(turno.isTomoAlmuerzo())
                .feriado(turno.isEsFeriado())
                .turnoPartido(partido)
                .build();
    }

    private RelacionKey keyRelacion(Turno turno) {
        return new RelacionKey(turno.getColaborador().getId(), turno.getEmpresa().getId());
    }

    private ColaboradorDiaKey keyDia(Turno turno) {
        return new ColaboradorDiaKey(turno.getColaborador().getId(), turno.getFecha());
    }

    private void validar(LocalDate desde, LocalDate hasta, Long empresaId, Double umbral) {
        if (desde == null || hasta == null) throw new IllegalArgumentException("Debe indicar las fechas desde y hasta");
        if (desde.isAfter(hasta)) throw new IllegalArgumentException("La fecha desde no puede ser posterior a la fecha hasta");
        if (desde.plusYears(2).isBefore(hasta)) throw new IllegalArgumentException("El rango no puede superar dos años");
        if (empresaId != null && empresaId <= 0) throw new IllegalArgumentException("La empresa debe ser válida");
        if (umbral != null && (!Double.isFinite(umbral) || umbral <= 0)) {
            throw new IllegalArgumentException("El umbral diario debe ser mayor que cero");
        }
    }

    private record RelacionKey(Long colaboradorId, Long empresaId) {}
    private record ColaboradorDiaKey(Long colaboradorId, LocalDate fecha) {}
}
