package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ResumenMensualDTO;
import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TiendaRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TurnoService {

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
    public TurnoDTO saveTurno(Turno turno) {
        if (turno.getColaborador() == null || turno.getColaborador().getId() == null) {
            throw new IllegalArgumentException("El colaborador debe estar especificado en el turno");
        }
        if (turno.getTienda() == null || turno.getTienda().getId() == null) {
            throw new IllegalArgumentException("La tienda debe estar especificada en el turno");
        }
        if (turno.getFecha() == null || turno.getHoraEntrada() == null || turno.getHoraSalida() == null) {
            throw new IllegalArgumentException("Fecha y horas son obligatorias");
        }
        if (!turno.getHoraSalida().isAfter(turno.getHoraEntrada())) {
            throw new IllegalArgumentException("La hora de salida debe ser posterior a la hora de entrada");
        }

        Colaborador colaborador = colaboradorRepository.findById(turno.getColaborador().getId())
                .orElseThrow(() -> new IllegalArgumentException("El colaborador con ID " + turno.getColaborador().getId() + " no existe"));
        Tienda tienda = tiendaRepository.findById(turno.getTienda().getId())
                .orElseThrow(() -> new IllegalArgumentException("La tienda con ID " + turno.getTienda().getId() + " no existe"));

        if (colaborador.getEmpresa() == null) {
            throw new IllegalArgumentException("El colaborador no tiene una empresa asignada");
        }

        turno.setColaborador(colaborador);
        turno.setEmpresa(colaborador.getEmpresa());
        turno.setTienda(tienda);
        turno.setEsFeriado(feriadoService.isFeriado(turno.getFecha()));
        Turno savedTurno = turnoRepository.save(turno);
        return convertToDTO(savedTurno);
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

            // Mapa para almacenar la suma de horas trabajadas por colaborador
            Map<Long, Double> horasSemanalesPorColaborador = new HashMap<>();

            for (Turno turno : turnos) {
                double horasTrabajadas = calcularHorasTrabajadas(turno);
                horasSemanalesPorColaborador.put(
                        turno.getColaborador().getId(),
                        horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0) + horasTrabajadas
                );
            }

            return turnos.stream().map(turno -> {
                TurnoDTO dto = convertToDTO(turno);
                dto.setHorasTotalesSemana(horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0));
                return dto;
            }).collect(Collectors.toList());

        } catch (Exception e) {
            throw new RuntimeException("Error al procesar la semana: " + fecha, e);
        }
    }

    private double calcularHorasTrabajadas(Turno turno) {
        if (turno.getHoraEntrada() != null && turno.getHoraSalida() != null) {
            long minutosTrabajados = java.time.Duration.between(turno.getHoraEntrada(), turno.getHoraSalida()).toMinutes();

            // Restar 45 minutos si el turno abarca la hora del almuerzo (12:00 - 13:00)
            if (turno.getHoraEntrada().isBefore(LocalTime.of(12, 1)) && turno.getHoraSalida().isAfter(LocalTime.of(14, 0))) {
                minutosTrabajados -= 45;
            }

            return minutosTrabajados / 60.0; // Convertir minutos a horas
        }
        return 0;
    }

    // Obtener turnos por mes para un colaborador específico
    public List<TurnoDTO> getTurnosMensualesPorColaborador(Long colaboradorId, int mes, int anio) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        return turnoRepository.findByColaborador_IdAndFechaBetween(colaboradorId, inicioMes, finMes).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Obtener turnos por mes para todos los colaboradores
    public List<TurnoDTO> getTurnosMensuales(int mes, int anio) {
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
        return turnoRepository.findByFechaBetween(inicioMes, finMes).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Métodos privados
    private LocalDate getInicioSemana(String fecha) {
        LocalDate parsedDate = LocalDate.parse(fecha);
        return parsedDate.with(java.time.DayOfWeek.MONDAY);
    }

    @Transactional
    public TurnoDTO updateTurno(Long id, Turno updatedTurno) {
        return turnoRepository.findById(id).map(turno -> {
            if (updatedTurno.getColaborador() == null || updatedTurno.getColaborador().getId() == null) {
                throw new IllegalArgumentException("El colaborador debe estar especificado en el turno");
            }
            if (updatedTurno.getTienda() == null || updatedTurno.getTienda().getId() == null) {
                throw new IllegalArgumentException("La tienda debe estar especificada en el turno");
            }
            if (updatedTurno.getFecha() == null || updatedTurno.getHoraEntrada() == null || updatedTurno.getHoraSalida() == null) {
                throw new IllegalArgumentException("Fecha y horas son obligatorias");
            }
            if (!updatedTurno.getHoraSalida().isAfter(updatedTurno.getHoraEntrada())) {
                throw new IllegalArgumentException("La hora de salida debe ser posterior a la hora de entrada");
            }

            Colaborador colaborador = colaboradorRepository.findById(updatedTurno.getColaborador().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Colaborador con ID " + updatedTurno.getColaborador().getId() + " no existe"));
            Tienda tienda = tiendaRepository.findById(updatedTurno.getTienda().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Tienda con ID " + updatedTurno.getTienda().getId() + " no existe"));

            if (colaborador.getEmpresa() == null) {
                throw new IllegalArgumentException("El colaborador no tiene una empresa asignada");
            }

            turno.setColaborador(colaborador);
            turno.setFecha(updatedTurno.getFecha());
            turno.setHoraEntrada(updatedTurno.getHoraEntrada());
            turno.setHoraSalida(updatedTurno.getHoraSalida());
            turno.setEmpresa(colaborador.getEmpresa());
            turno.setTienda(tienda);
            turno.setEsFeriado(feriadoService.isFeriado(updatedTurno.getFecha()));
            Turno updated = turnoRepository.save(turno);
            return convertToDTO(updated);
        }).orElseThrow(() -> new IllegalArgumentException("Turno con ID " + id + " no encontrado"));
    }

    @Transactional
    public void deleteTurno(Long id) {
        Turno turno = turnoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Turno con ID " + id + " no encontrado"));
        turnoRepository.delete(turno);
    }

    public TurnoDTO convertToDTO(Turno turno) {
        boolean tomoAlmuerzo = turno.getHoraEntrada() != null && turno.getHoraSalida() != null &&
                turno.getHoraEntrada().isBefore(LocalTime.of(12, 1)) &&
                turno.getHoraSalida().isAfter(LocalTime.of(14, 0));

        boolean esFeriado = feriadoService.isFeriado(turno.getFecha());

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
                tomoAlmuerzo,
                0.0, // horasTotalesSemana inicializado en 0
                esFeriado
        );
    }

    // ---- AGREGADOS PARA LA OPTIMIZACIÓN --------

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

        // Calcular las horas trabajadas por semana
        for (List<String> semana : semanas) {
            if (!semana.isEmpty()) {
                LocalDate inicioSemana = LocalDate.parse(semana.get(0));
                LocalDate finSemana = LocalDate.parse(semana.get(semana.size() - 1));
                List<Turno> turnos = turnoRepository.findByFechaBetween(inicioSemana, finSemana);
                Map<Long, Double> horasSemanalesPorColaborador = new HashMap<>();

                for (Turno turno : turnos) {
                    double horasTrabajadas = calcularHorasTrabajadas(turno);
                    horasSemanalesPorColaborador.put(
                            turno.getColaborador().getId(),
                            horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0) + horasTrabajadas
                    );
                }

                // Asignar las horas totales a cada turno en la semana
                for (Turno turno : turnos) {
                    turno.setHorasTrabajadas(horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0));
                }
            }
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

            // Mapa para almacenar la suma de horas trabajadas por colaborador en la semana
            Map<Long, Double> horasSemanalesPorColaborador = new HashMap<>();

            for (Turno turno : turnos) {
                double horasTrabajadas = calcularHorasTrabajadas(turno);
                horasSemanalesPorColaborador.put(
                        turno.getColaborador().getId(),
                        horasSemanalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0) + horasTrabajadas
                );
            }

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
            Map<Long, Double> horasTotalesPorColaborador = new HashMap<>();

            for (Turno turno : turnos) {
                double horasTrabajadas = calcularHorasTrabajadas(turno);
                horasTotalesPorColaborador.put(
                        turno.getColaborador().getId(),
                        horasTotalesPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0) + horasTrabajadas
                );
            }

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

        Map<Long, Double> horasTotales = new HashMap<>();

        for (Turno turno : turnos) {
            horasTotales.put(
                    turno.getColaborador().getId(),
                    horasTotales.getOrDefault(turno.getColaborador().getId(), 0.0) + turno.getHorasTrabajadas()
            );
        }

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

        // Calcular horas totales en feriados por colaborador
        Map<Long, Double> horasFeriadosPorColaborador = new HashMap<>();
        for (Turno turno : turnos) {
            double horasTrabajadas = calcularHorasTrabajadas(turno);
            horasFeriadosPorColaborador.put(
                    turno.getColaborador().getId(),
                    horasFeriadosPorColaborador.getOrDefault(turno.getColaborador().getId(), 0.0) + horasTrabajadas
            );
        }

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

        List<ResumenMensualDTO> resumenes = new ArrayList<>();

        for (Long colaboradorId : idsAConsultar) {
            List<Turno> turnosColaborador = turnosPorColaborador.getOrDefault(colaboradorId, Collections.emptyList());

            // Calcular totales
            double totalHorasMes = turnosColaborador.stream()
                    .mapToDouble(this::calcularHorasTrabajadas)
                    .sum();

            long diasFeriadosTrabajados = turnosColaborador.stream()
                    .filter(Turno::isEsFeriado)
                    .map(Turno::getFecha)
                    .distinct()
                    .count();

            double horasEnFeriados = turnosColaborador.stream()
                    .filter(Turno::isEsFeriado)
                    .mapToDouble(this::calcularHorasTrabajadas)
                    .sum();

            Colaborador colaborador = colaboradorRepository.findById(colaboradorId)
                    .orElseThrow(() -> new RuntimeException("Colaborador no encontrado"));

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
