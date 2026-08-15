package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.DistribucionTiendaDTO;
import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TurnoDiarioAgregado;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import com.sportcenter.shift_manager.repository.TurnoTiendaAgregado;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reportes agregados que no encajan en TurnoService (esa clase concentra
 * el CRUD de turnos y los reportes "livianos" ya existentes bajo su sección
 * // --------------------- REPORTES). Este servicio es el punto de partida
 * de un paquete Reporte* separado para los reportes contables/analíticos
 * nuevos (preliquidación mensual, y los que sigan).
 */
@Service
public class ReporteService {

    // Umbral diario por defecto para "horas extra candidatas". Provisional:
    // Colaborador no tiene hoy un campo de jornada contractual, así que esto
    // es un valor global parametrizable por query param, no una regla por
    // colaborador. Ver PreliquidacionMensualDTO.horasExtraCandidatas.
    private static final double UMBRAL_HORAS_DIARIAS_DEFAULT = 8.0;

    private final TurnoRepository turnoRepository;
    private final ColaboradorRepository colaboradorRepository;
    private final TurnoService turnoService;

    public ReporteService(TurnoRepository turnoRepository, ColaboradorRepository colaboradorRepository, TurnoService turnoService) {
        this.turnoRepository = turnoRepository;
        this.colaboradorRepository = colaboradorRepository;
        this.turnoService = turnoService;
    }

    public List<PreliquidacionMensualDTO> getPreliquidacionMensual(int mes, int anio, Long empresaId, Double umbralHorasDiariasParam) {
        LocalDate inicio = LocalDate.of(anio, mes, 1);
        LocalDate fin = inicio.withDayOfMonth(inicio.lengthOfMonth());
        double umbral = umbralHorasDiariasParam != null ? umbralHorasDiariasParam : UMBRAL_HORAS_DIARIAS_DEFAULT;

        List<TurnoDiarioAgregado> diarios = turnoRepository.sumarizarPorColaboradorYDia(inicio, fin, empresaId);
        if (diarios.isEmpty()) {
            return List.of();
        }

        Map<Long, List<TurnoDiarioAgregado>> diariosPorColaborador = diarios.stream()
                .collect(Collectors.groupingBy(TurnoDiarioAgregado::getColaboradorId));

        List<TurnoTiendaAgregado> porTienda = turnoRepository.sumarizarPorColaboradorYTienda(inicio, fin, empresaId);
        Map<Long, List<TurnoTiendaAgregado>> tiendaPorColaborador = porTienda.stream()
                .collect(Collectors.groupingBy(TurnoTiendaAgregado::getColaboradorId));

        List<Long> colaboradorIds = new ArrayList<>(diariosPorColaborador.keySet());

        // findAllById con @EntityGraph (ColaboradorRepository) en vez de
        // findById uno por uno: una sola query trae empresa+puesto de todos
        // los colaboradores con actividad ese mes.
        Map<Long, Colaborador> colaboradoresPorId = colaboradorRepository.findAllById(colaboradorIds).stream()
                .collect(Collectors.toMap(Colaborador::getId, Function.identity()));

        // Detalle de turnos para el drill-down / hoja "Detalle" del Excel.
        // Reusa convertToDTO de TurnoService en vez de duplicar el mapeo a
        // TurnoDTO acá.
        List<Turno> turnosDelMes = turnoRepository.findByColaborador_IdInAndFechaBetween(colaboradorIds, inicio, fin);
        Map<Long, List<TurnoDTO>> turnosPorColaborador = turnosDelMes.stream()
                .map(turnoService::convertToDTO)
                .collect(Collectors.groupingBy(TurnoDTO::getColaboradorId));

        List<PreliquidacionMensualDTO> resultado = new ArrayList<>();
        for (Map.Entry<Long, List<TurnoDiarioAgregado>> entry : diariosPorColaborador.entrySet()) {
            Long colaboradorId = entry.getKey();
            Colaborador colaborador = colaboradoresPorId.get(colaboradorId);
            if (colaborador == null) {
                // No debería pasar (el colaboradorId sale de un turno real),
                // pero si el colaborador fue borrado entre queries, se omite
                // en vez de romper todo el reporte.
                continue;
            }

            resultado.add(armarFilaColaborador(
                    colaborador,
                    entry.getValue(),
                    tiendaPorColaborador.getOrDefault(colaboradorId, List.of()),
                    turnosPorColaborador.getOrDefault(colaboradorId, List.of()),
                    umbral
            ));
        }

        resultado.sort(
                Comparator.comparing(PreliquidacionMensualDTO::getApellido, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(PreliquidacionMensualDTO::getNombre, String.CASE_INSENSITIVE_ORDER)
        );
        return resultado;
    }

    private PreliquidacionMensualDTO armarFilaColaborador(
            Colaborador colaborador,
            List<TurnoDiarioAgregado> dias,
            List<TurnoTiendaAgregado> tiendas,
            List<TurnoDTO> turnos,
            double umbral
    ) {
        double totalHorasMes = 0;
        double horasEnFeriados = 0;
        double horasExtraCandidatas = 0;
        int turnosPartidos = 0;

        for (TurnoDiarioAgregado dia : dias) {
            double horasDelDia = (dia.getMinutosNetos() != null ? dia.getMinutosNetos() : 0) / 60.0;
            totalHorasMes += horasDelDia;

            if (Boolean.TRUE.equals(dia.getEsFeriado())) {
                horasEnFeriados += horasDelDia;
            }
            if (horasDelDia > umbral) {
                horasExtraCandidatas += horasDelDia - umbral;
            }
            if (dia.getCantidadTurnos() != null && dia.getCantidadTurnos() > 1) {
                turnosPartidos++;
            }
        }

        List<DistribucionTiendaDTO> distribucion = tiendas.stream()
                .map(t -> new DistribucionTiendaDTO(t.getTiendaId(), t.getNombreTienda(), t.getHoras() != null ? t.getHoras() : 0.0))
                .toList();

        return PreliquidacionMensualDTO.builder()
                .colaboradorId(colaborador.getId())
                .dni(colaborador.getDni())
                .nombre(colaborador.getNombre())
                .apellido(colaborador.getApellido())
                .empresaId(colaborador.getEmpresa() != null ? colaborador.getEmpresa().getId() : null)
                .nombreEmpresa(colaborador.getEmpresa() != null ? colaborador.getEmpresa().getNombre() : "Sin Empresa")
                .puestoId(colaborador.getPuesto() != null ? colaborador.getPuesto().getId() : null)
                .nombrePuesto(colaborador.getPuesto() != null ? colaborador.getPuesto().getNombre() : "Sin Puesto")
                .diasProgramados(dias.size())
                .totalHorasMes(totalHorasMes)
                .horasEnFeriados(horasEnFeriados)
                .horasExtraCandidatas(horasExtraCandidatas)
                .umbralHorasDiariasUsado(umbral)
                .turnosPartidos(turnosPartidos)
                .distribucionPorTienda(distribucion)
                .turnos(turnos)
                .build();
    }
}
