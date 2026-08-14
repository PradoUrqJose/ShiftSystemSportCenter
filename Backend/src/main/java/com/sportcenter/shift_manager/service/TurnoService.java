package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ResumenMensualDTO;
import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.dto.TurnoRequestDTO;
import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TiendaRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TurnoService {
    private static final Logger log = LoggerFactory.getLogger(TurnoService.class);

    // Atributos privados
    private final TurnoRepository turnoRepository;
    private final ColaboradorRepository colaboradorRepository;
    private final TiendaRepository tiendaRepository;
    private final FeriadoService feriadoService;

    // Constructor
    public TurnoService(TurnoRepository turnoRepository, ColaboradorRepository colaboradorRepository, TiendaRepository tiendaRepository, FeriadoService feriadoService) {
        this.turnoRepository = turnoRepository;
        this.colaboradorRepository = colaboradorRepository;
        this.tiendaRepository = tiendaRepository;
        this.feriadoService = feriadoService;
    }

    // Métodos públicos: CRUD de turnos
    @Transactional
    public TurnoDTO saveTurno(TurnoRequestDTO request) {
        Turno turno = new Turno();
        aplicarDatosTurno(turno, request);
        Turno savedTurno = turnoRepository.save(turno);
        log.info("Turno creado: id={}, colaboradorId={}, fecha={}", savedTurno.getId(), request.getColaboradorId(), request.getFecha());
        return convertToDTO(savedTurno);
    }

    @Transactional
    public TurnoDTO updateTurno(Long id, TurnoRequestDTO request) {
        Turno turno = turnoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turno con ID " + id + " no encontrado"));
        aplicarDatosTurno(turno, request);
        Turno updated = turnoRepository.save(turno);
        log.info("Turno actualizado: id={}", id);
        return convertToDTO(updated);
    }

    @Transactional
    public void deleteTurno(Long id) {
        Turno turno = turnoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Turno con ID " + id + " no encontrado"));
        turnoRepository.delete(turno);
        log.info("Turno eliminado: id={}", id);
    }

    // Validación + armado de un turno a partir del DTO de entrada. Antes esta
    // misma lógica (validar colaborador/tienda/horas) estaba duplicada entera
    // entre saveTurno y updateTurno.
    private void aplicarDatosTurno(Turno turno, TurnoRequestDTO request) {
        if (!request.getHoraSalida().isAfter(request.getHoraEntrada())) {
            throw new IllegalArgumentException("La hora de salida debe ser posterior a la hora de entrada");
        }

        Colaborador colaborador = colaboradorRepository.findById(request.getColaboradorId())
                .orElseThrow(() -> new ResourceNotFoundException("El colaborador con ID " + request.getColaboradorId() + " no existe"));
        Tienda tienda = tiendaRepository.findById(request.getTiendaId())
                .orElseThrow(() -> new ResourceNotFoundException("La tienda con ID " + request.getTiendaId() + " no existe"));

        if (colaborador.getEmpresa() == null) {
            throw new IllegalArgumentException("El colaborador no tiene una empresa asignada");
        }

        turno.setColaborador(colaborador);
        turno.setEmpresa(colaborador.getEmpresa());
        turno.setTienda(tienda);
        turno.setFecha(request.getFecha());
        turno.setHoraEntrada(request.getHoraEntrada());
        turno.setHoraSalida(request.getHoraSalida());
        turno.setEsFeriado(feriadoService.isFeriado(request.getFecha()));
    }

    // Métodos públicos: Gestión de turnos por colaborador
    public List<TurnoDTO> getTurnosByColaboradorId(Long colaboradorId) {
        return turnoRepository.findByColaborador_Id(colaboradorId).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Métodos públicos: Gestión de turnos por semana
    public List<TurnoDTO> getTurnosPorSemanaDTO(String fecha) {
        try {
            LocalDate inicioSemana = getInicioSemana(fecha);
            LocalDate finSemana = inicioSemana.plusDays(6);

            List<Turno> turnos = turnoRepository.findByFechaBetween(inicioSemana, finSemana);
            Map<Long, Double> horasSemanalesPorColaborador = calcularHorasPorColaborador(turnos);

            return turnos.stream().map(turno -> {
                TurnoDTO dto = convertToDTO(turno);
                dto.setHorasTotalesSemana(horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0));
                return dto;
            }).collect(Collectors.toList());

        } catch (Exception e) {
            throw new RuntimeException("Error al procesar la semana: " + fecha, e);
        }
    }

    // Suma las horas trabajadas de una lista de turnos, agrupadas por colaborador
    private Map<Long, Double> calcularHorasPorColaborador(List<Turno> turnos) {
        Map<Long, Double> horasPorColaborador = new HashMap<>();
        for (Turno turno : turnos) {
            horasPorColaborador.merge(turno.getColaborador().getId(), turno.getHorasTrabajadas(), Double::sum);
        }
        return horasPorColaborador;
    }

    // Obtener turnos por mes para un colaborador específico
    public List<TurnoDTO> getTurnosMensualesPorColaborador(Long colaboradorId, int mes, int anio) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        return turnoRepository.findByColaborador_IdAndFechaBetween(colaboradorId, inicioMes, finMes).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Obtener turnos por mes para todos los colaboradores, paginado
    public Page<TurnoDTO> getTurnosMensuales(int mes, int anio, Pageable pageable) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        return turnoRepository.findByFechaBetween(inicioMes, finMes, pageable).map(this::convertToDTO);
    }

    // Métodos privados
    private LocalDate getInicioSemana(String fecha) {
        LocalDate parsedDate = LocalDate.parse(fecha);
        return parsedDate.with(java.time.DayOfWeek.MONDAY);
    }

    public TurnoDTO convertToDTO(Turno turno) {
        return new TurnoDTO(
                turno.getId(),
                turno.getColaborador() != null ? turno.getColaborador().getId() : null,
                turno.getColaborador() != null ? turno.getColaborador().getNombre() : "Sin Nombre",
                turno.getColaborador() != null ? turno.getColaborador().getDni() : "Sin DNI",
                turno.getEmpresa() != null ? turno.getEmpresa().getNombre() : "Sin Empresa",
                turno.getEmpresa() != null ? turno.getEmpresa().getId() : null, // Añadir empresaId
                turno.getTienda() != null ? turno.getTienda().getId() : null,
                turno.getTienda() != null ? turno.getTienda().getNombre() : "Sin Tienda",
                turno.getFecha(),
                turno.getHoraEntrada(),
                turno.getHoraSalida(),
                turno.getHorasTrabajadas(),
                turno.isTomoAlmuerzo(),
                0.0, // horasTotalesSemana inicializado en 0
                turno.isEsFeriado() // persistido en la entidad; ya no se vuelve a consultar feriadoService por turno
        );
    }

    // ---- AGREGADOS PARA LA OPTIMIZACIÓN --------

    // Devuelve solo los rangos de fechas de cada semana del mes (para armar el
    // selector de semanas en el frontend). No consulta turnos: antes traía y
    // recalculaba horas trabajadas de cada semana acá adentro sin usar el
    // resultado para nada (el valor real se pide aparte, ver getTurnosPorSemanaEstricta).
    public List<List<String>> calcularSemanasDelMes(int mes, int anio) {
        List<List<String>> semanas = new ArrayList<>();
        List<String> semanaActual = new ArrayList<>();
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        LocalDate diaActual = inicioMes;

        // 1️⃣ PRIMERA SEMANA (INCOMPLETA, si el mes no inicia en Lunes)
        while (diaActual.getDayOfWeek() != DayOfWeek.MONDAY && !diaActual.isAfter(finMes)) {
            semanaActual.add(diaActual.toString());
            diaActual = diaActual.plusDays(1);
        }

        // Si hay días en la primera semana, la agregamos antes de avanzar a semanas regulares
        if (!semanaActual.isEmpty()) {
            semanas.add(new ArrayList<>(semanaActual));
            semanaActual.clear();
        }

        // 2️⃣ SEMANAS REGULARES (Lunes a Domingo)
        while (!diaActual.isAfter(finMes)) {
            for (int i = 0; i < 7 && !diaActual.isAfter(finMes); i++) {
                semanaActual.add(diaActual.toString());
                diaActual = diaActual.plusDays(1);
            }
            semanas.add(new ArrayList<>(semanaActual));
            semanaActual.clear();
        }

        if (!semanaActual.isEmpty()) {
            semanas.add(new ArrayList<>(semanaActual));
        }

        return semanas;
    }

    public List<TurnoDTO> getTurnosPorSemanaEstricta(int mes, int anio, int numeroSemana) {
        List<List<String>> semanasDelMes = calcularSemanasDelMes(mes, anio);
        List<TurnoDTO> turnosDTO = new ArrayList<>();

        // Validar que el número de semana sea válido
        if (numeroSemana < 1 || numeroSemana > semanasDelMes.size()) {
            throw new IllegalArgumentException("El número de semana " + numeroSemana + " no es válido para el mes " + mes + "/" + anio + ". Hay " + semanasDelMes.size() + " semanas.");
        }

        // Obtener la semana específica (el índice es numeroSemana - 1 porque las listas empiezan en 0)
        List<String> semana = semanasDelMes.get(numeroSemana - 1);

        if (!semana.isEmpty()) {
            LocalDate inicioSemana = LocalDate.parse(semana.get(0));
            LocalDate finSemana = LocalDate.parse(semana.get(semana.size() - 1));

            List<Turno> turnos = turnoRepository.findByFechaBetween(inicioSemana, finSemana);
            Map<Long, Double> horasSemanalesPorColaborador = calcularHorasPorColaborador(turnos);

            // Convertir turnos a DTO y asignar horas semanales
            for (Turno turno : turnos) {
                TurnoDTO dto = convertToDTO(turno);
                dto.setHorasTotalesSemana(horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0));
                turnosDTO.add(dto);
            }
        }

        return turnosDTO;
    }

    // --------------------- REPORTES ------------------------
    // Reporte 1: Colaboradores por tienda y rango de fechas
    public List<TurnoDTO> getColaboradoresPorTiendaYRangoFechas(Long tiendaId, String fechaInicio, String fechaFin) {
        try {
            LocalDate parsedFechaInicio = LocalDate.parse(fechaInicio);
            LocalDate parsedFechaFin = LocalDate.parse(fechaFin);
            List<Turno> turnos = turnoRepository.findByTienda_IdAndFechaBetweenOrderByFechaAsc(tiendaId, parsedFechaInicio, parsedFechaFin);
            Map<Long, Double> horasTotalesPorColaborador = calcularHorasPorColaborador(turnos);

            // Convertir a DTO con horas totales acumuladas
            return turnos.stream()
                    .map(turno -> {
                        TurnoDTO dto = convertToDTO(turno);
                        dto.setHorasTotalesSemana(horasTotalesPorColaborador.get(turno.getColaborador().getId()));
                        return dto;
                    })
                    .distinct() // Evitar duplicados por colaborador si se desea
                    .collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException("Error al parsear las fechas: " + fechaInicio + " - " + fechaFin, e);
        }
    }


    public List<TurnoDTO> getHorasTrabajadasPorColaboradores(List<Long> colaboradores, String fechaInicio, String fechaFin) {
        LocalDate inicio = LocalDate.parse(fechaInicio);
        LocalDate fin = LocalDate.parse(fechaFin);

        List<Turno> turnos = turnoRepository.findByColaborador_IdInAndFechaBetween(colaboradores, inicio, fin);
        Map<Long, Double> horasTotales = calcularHorasPorColaborador(turnos);

        return turnos.stream().map(turno -> {
            TurnoDTO dto = convertToDTO(turno);
            dto.setHorasTotalesSemana(horasTotales.get(turno.getColaborador().getId())); // Asignamos total
            return dto;
        }).distinct().toList();
    }

    // Reporte 3: Turnos en feriados (MODIFICADO)
    public List<TurnoDTO> getTurnosEnFeriados(List<Long> colaboradores, String fechaInicio, String fechaFin) {
        LocalDate inicio = LocalDate.parse(fechaInicio);
        LocalDate fin = LocalDate.parse(fechaFin);
        // Filtrar por colaboradores y rango de fechas, luego por feriados
        List<Turno> turnos = turnoRepository.findByColaborador_IdInAndFechaBetween(colaboradores, inicio, fin)
                .stream()
                .filter(Turno::isEsFeriado)
                .collect(Collectors.toList());

        Map<Long, Double> horasFeriadosPorColaborador = calcularHorasPorColaborador(turnos);

        return turnos.stream()
                .map(turno -> {
                    TurnoDTO dto = convertToDTO(turno);
                    dto.setHorasTotalesSemana(horasFeriadosPorColaborador.get(turno.getColaborador().getId()));
                    return dto;
                })
                .distinct()
                .collect(Collectors.toList());
    }


    public List<ResumenMensualDTO> getResumenMensualPorColaboradores(List<Long> colaboradoresIds, int mes, int anio) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());

        // Si no se especifican colaboradores, obtener todos
        List<Long> idsAConsultar = colaboradoresIds != null && !colaboradoresIds.isEmpty()
                ? colaboradoresIds
                : colaboradorRepository.findAll().stream().map(Colaborador::getId).toList();

        List<Turno> turnos = turnoRepository.findByColaborador_IdInAndFechaBetween(idsAConsultar, inicioMes, finMes);

        // Agrupar turnos por colaborador
        Map<Long, List<Turno>> turnosPorColaborador = turnos.stream()
                .collect(Collectors.groupingBy(t -> t.getColaborador().getId()));

        // Antes: un findById por colaborador dentro del for (N+1). Ahora: una sola
        // consulta con findAllById para todos los IDs a la vez.
        Map<Long, Colaborador> colaboradoresPorId = colaboradorRepository.findAllById(idsAConsultar).stream()
                .collect(Collectors.toMap(Colaborador::getId, c -> c));

        List<ResumenMensualDTO> resumenes = new ArrayList<>();

        for (Long colaboradorId : idsAConsultar) {
            List<Turno> turnosColaborador = turnosPorColaborador.getOrDefault(colaboradorId, Collections.emptyList());

            // Calcular totales
            double totalHorasMes = turnosColaborador.stream()
                    .mapToDouble(Turno::getHorasTrabajadas)
                    .sum();

            long diasFeriadosTrabajados = turnosColaborador.stream()
                    .filter(Turno::isEsFeriado)
                    .map(Turno::getFecha)
                    .distinct()
                    .count();

            double horasEnFeriados = turnosColaborador.stream()
                    .filter(Turno::isEsFeriado)
                    .mapToDouble(Turno::getHorasTrabajadas)
                    .sum();

            Colaborador colaborador = colaboradoresPorId.get(colaboradorId);
            if (colaborador == null) {
                throw new ResourceNotFoundException("Colaborador con ID " + colaboradorId + " no encontrado");
            }

            ResumenMensualDTO resumen = new ResumenMensualDTO(
                    colaboradorId,
                    colaborador.getNombre(),
                    totalHorasMes,
                    (int) diasFeriadosTrabajados,
                    horasEnFeriados,
                    turnosColaborador.stream().map(this::convertToDTO).toList() // Opcional
            );

            resumenes.add(resumen);
        }

        return resumenes;
    }
}
