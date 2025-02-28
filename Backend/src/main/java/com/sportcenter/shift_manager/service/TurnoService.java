package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ResumenMensualDTO;
import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Feriado;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TiendaRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    public Turno saveTurno(Turno turno) {
        if (turno.getColaborador() == null || turno.getColaborador().getId() == null) {
            throw new RuntimeException("El colaborador debe estar especificado en el turno");
        }

        // Verificar que la hora de salida sea posterior a la hora de entrada
        if (turno.getHoraEntrada() != null && turno.getHoraSalida() != null) {
            if (!turno.getHoraSalida().isAfter(turno.getHoraEntrada())) {
                throw new RuntimeException("La hora de salida debe ser posterior a la hora de entrada");
            }
        }
        // Verificar que el colaborador existe
        Colaborador colaborador = colaboradorRepository.findById(turno.getColaborador().getId())
                .orElseThrow(() -> new RuntimeException("El colaborador con ID " + turno.getColaborador().getId() + " no existe"));

        Tienda tienda = tiendaRepository.findById(turno.getTienda().getId())
                .orElseThrow(() -> new RuntimeException("La tienda con ID " + turno.getTienda().getId() + " no existe"));

        // Verificar si el turno es en un día feriado
        boolean esFeriado = feriadoService.isFeriado(turno.getFecha());
        turno.setEsFeriado(esFeriado);

        turno.setColaborador(colaborador);
        turno.setEmpresa(colaborador.getEmpresa()); // Aseguramos que la empresa también se asocia correctamente
        turno.setTienda(tienda);
        return turnoRepository.save(turno); // Guardamos el turno y lo retornamos
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
            if (turno.getHoraEntrada().isBefore(LocalTime.of(12, 1)) && turno.getHoraSalida().isAfter(LocalTime.of(13, 0))) {
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

    public Turno updateTurno(Long id, Turno updatedTurno) {
        return turnoRepository.findById(id).map(turno -> {
            // Validar que la hora de salida sea posterior a la de entrada
            if (updatedTurno.getHoraEntrada() != null && updatedTurno.getHoraSalida() != null) {
                if (!updatedTurno.getHoraSalida().isAfter(updatedTurno.getHoraEntrada())) {
                    throw new RuntimeException("La hora de salida debe ser posterior a la hora de entrada");
                }
            }

            Optional<Colaborador> colaboradorOpt = colaboradorRepository.findById(updatedTurno.getColaborador().getId());
            if (colaboradorOpt.isEmpty()) {
                throw new RuntimeException("Colaborador con ID " + updatedTurno.getColaborador().getId() + " no existe");
            }

            Optional<Tienda> tiendaOpt = tiendaRepository.findById(updatedTurno.getTienda().getId());
            if (tiendaOpt.isEmpty()) {
                throw new RuntimeException("Tienda con ID " + updatedTurno.getTienda().getId() + " no existe");
            }

            turno.setColaborador(colaboradorOpt.get());
            turno.setFecha(updatedTurno.getFecha());
            turno.setHoraEntrada(updatedTurno.getHoraEntrada());
            turno.setHoraSalida(updatedTurno.getHoraSalida());
            turno.setTienda(tiendaOpt.get());
            return turnoRepository.save(turno);
        }).orElseThrow(() -> new RuntimeException("Turno no encontrado"));
    }

    public void deleteTurno(Long id) {
        turnoRepository.deleteById(id);
    }

    public TurnoDTO convertToDTO(Turno turno) {
        boolean tomoAlmuerzo = false;
        if (turno.getHoraEntrada() != null && turno.getHoraSalida() != null) {
            tomoAlmuerzo = turno.getHoraEntrada().isBefore(LocalTime.of(12, 1))
                    && turno.getHoraSalida().isAfter(LocalTime.of(13, 0));
        }

        boolean esFeriado = feriadoService.isFeriado(turno.getFecha());

        return new TurnoDTO(
                turno.getId(),
                turno.getColaborador() != null ? turno.getColaborador().getId() : null,
                turno.getColaborador() != null ? turno.getColaborador().getNombre() : "Sin Nombre",
                turno.getColaborador() != null ? turno.getColaborador().getDni() : "Sin DNI",
                turno.getEmpresa() != null ? turno.getEmpresa().getNombre() : "Sin Empresa",
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

        // Obtener primer y último día del mes
        LocalDate inicioMes = LocalDate.of(anio, mes, 1);
        LocalDate finMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());

        System.out.println("Inicio del mes: " + inicioMes);
        System.out.println("Fin del mes: " + finMes);

        // Iniciar desde el primer día del mes
        LocalDate diaActual = inicioMes;

        // 1️⃣ PRIMERA SEMANA (INCOMPLETA, si el mes no inicia en Lunes)
        while (diaActual.getDayOfWeek() != DayOfWeek.MONDAY && !diaActual.isAfter(finMes)) {
            semanaActual.add(diaActual.toString());
            diaActual = diaActual.plusDays(1);
        }

        // Si hay días en la primera semana, la agregamos antes de avanzar a semanas regulares
        if (!semanaActual.isEmpty()) {
            System.out.println("Primera semana (incompleta): " + semanaActual);
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
            System.out.println("Semana generada: " + semanaActual);
            semanaActual.clear();
        }

        // 3️⃣ ÚLTIMA SEMANA (INCOMPLETA, si el mes no termina en Domingo)
        if (!semanaActual.isEmpty()) {
            System.out.println("Última semana (incompleta): " + semanaActual);
            semanas.add(new ArrayList<>(semanaActual));
        }

        System.out.println("Semanas finales generadas: " + semanas);

        // Calcular las horas trabajadas por semana
        for (List<String> semana : semanas) {
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

            // Calcular horas totales por colaborador en el rango de fechas
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
