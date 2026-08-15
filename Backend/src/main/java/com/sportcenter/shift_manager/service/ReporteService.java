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
        validarParametrosPreliquidacion(mes, anio, umbralHorasDiariasParam);

        LocalDate inicio = LocalDate.of(anio, mes, 1);
        LocalDate fin = inicio.withDayOfMonth(inicio.lengthOfMonth());
        double umbral = umbralHorasDiariasParam != null ? umbralHorasDiariasParam : UMBRAL_HORAS_DIARIAS_DEFAULT;

        List<TurnoDiarioAgregado> diarios = turnoRepository.sumarizarPorColaboradorYDia(inicio, fin, empresaId);
        if (diarios.isEmpty()) {
            return List.of();
        }

        Map<ColaboradorEmpresaKey, List<TurnoDiarioAgregado>> diariosPorColaboradorEmpresa = diarios.stream()
                .collect(Collectors.groupingBy(this::keyDe));

        List<TurnoTiendaAgregado> porTienda = turnoRepository.sumarizarPorColaboradorYTienda(inicio, fin, empresaId);
        Map<ColaboradorEmpresaKey, List<TurnoTiendaAgregado>> tiendaPorColaboradorEmpresa = porTienda.stream()
                .collect(Collectors.groupingBy(this::keyDe));

        List<Long> colaboradorIds = diariosPorColaboradorEmpresa.keySet().stream()
                .map(ColaboradorEmpresaKey::colaboradorId)
                .distinct()
                .toList();

        // findAllById con @EntityGraph (ColaboradorRepository) en vez de
        // findById uno por uno: una sola query trae empresa+puesto de todos
        // los colaboradores con actividad ese mes.
        Map<Long, Colaborador> colaboradoresPorId = colaboradorRepository.findAllById(colaboradorIds).stream()
                .collect(Collectors.toMap(Colaborador::getId, Function.identity()));

        // Detalle de turnos para el drill-down / hoja "Detalle" del Excel.
        // Reusa convertToDTO de TurnoService en vez de duplicar el mapeo a
        // TurnoDTO acá.
        List<Turno> turnosDelMes = empresaId == null
                ? turnoRepository.findByColaborador_IdInAndFechaBetween(colaboradorIds, inicio, fin)
                : turnoRepository.findByColaborador_IdInAndEmpresa_IdAndFechaBetween(colaboradorIds, empresaId, inicio, fin);
        Map<ColaboradorEmpresaKey, List<TurnoDTO>> turnosPorColaboradorEmpresa = turnosDelMes.stream()
                .map(turnoService::convertToDTO)
                .collect(Collectors.groupingBy(dto -> new ColaboradorEmpresaKey(dto.getColaboradorId(), dto.getEmpresaId())));

        List<PreliquidacionMensualDTO> resultado = new ArrayList<>();
        for (Map.Entry<ColaboradorEmpresaKey, List<TurnoDiarioAgregado>> entry : diariosPorColaboradorEmpresa.entrySet()) {
            ColaboradorEmpresaKey key = entry.getKey();
            Long colaboradorId = key.colaboradorId();
            Colaborador colaborador = colaboradoresPorId.get(colaboradorId);
            if (colaborador == null) {
                // No debería pasar (el colaboradorId sale de un turno real),
                // pero si el colaborador fue borrado entre queries, se omite
                // en vez de romper todo el reporte.
                continue;
            }

            resultado.add(armarFilaColaborador(
                    colaborador,
                    key.empresaId(),
                    entry.getValue().get(0).getNombreEmpresa(),
                    entry.getValue(),
                    tiendaPorColaboradorEmpresa.getOrDefault(key, List.of()),
                    turnosPorColaboradorEmpresa.getOrDefault(key, List.of()),
                    umbral
            ));
        }

        resultado.sort(
                Comparator.comparing(PreliquidacionMensualDTO::getNombreEmpresa, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(PreliquidacionMensualDTO::getApellido, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(PreliquidacionMensualDTO::getNombre, String.CASE_INSENSITIVE_ORDER)
        );
        return resultado;
    }

    private PreliquidacionMensualDTO armarFilaColaborador(
            Colaborador colaborador,
            Long empresaId,
            String nombreEmpresa,
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
                .empresaId(empresaId)
                .nombreEmpresa(nombreEmpresa != null ? nombreEmpresa : "Sin Empresa")
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

    private void validarParametrosPreliquidacion(int mes, int anio, Double umbralHorasDiarias) {
        if (mes < 1 || mes > 12) {
            throw new IllegalArgumentException("El mes debe estar entre 1 y 12");
        }
        if (anio < 2000 || anio > 2100) {
            throw new IllegalArgumentException("El año debe estar entre 2000 y 2100");
        }
        if (umbralHorasDiarias != null && (!Double.isFinite(umbralHorasDiarias) || umbralHorasDiarias <= 0)) {
            throw new IllegalArgumentException("El umbral de horas diarias debe ser mayor que cero");
        }
    }

    private ColaboradorEmpresaKey keyDe(TurnoDiarioAgregado agregado) {
        return new ColaboradorEmpresaKey(agregado.getColaboradorId(), agregado.getEmpresaId());
    }

    private ColaboradorEmpresaKey keyDe(TurnoTiendaAgregado agregado) {
        return new ColaboradorEmpresaKey(agregado.getColaboradorId(), agregado.getEmpresaId());
    }

    private record ColaboradorEmpresaKey(Long colaboradorId, Long empresaId) {}
}
