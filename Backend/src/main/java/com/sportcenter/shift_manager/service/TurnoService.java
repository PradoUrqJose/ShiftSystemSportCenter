package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class TurnoService {

    // Atributos privados
    private final TurnoRepository turnoRepository;
    private final ColaboradorRepository colaboradorRepository;

    // Constructor
    public TurnoService(TurnoRepository turnoRepository, ColaboradorRepository colaboradorRepository) {
        this.turnoRepository = turnoRepository;
        this.colaboradorRepository = colaboradorRepository;
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
            return turnoRepository.findByFechaBetween(inicioSemana, finSemana).stream()
                    .map(this::convertToDTO)
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("Error al parsear la fecha: " + fecha, e);
        }
    }


    // Métodos públicos: CRUD de turnos
    public Turno saveTurno(Turno turno) {
        if (turno.getColaborador() == null || turno.getColaborador().getId() == null) {
            throw new RuntimeException("El colaborador debe estar especificado en el turno");
        }

        // Verificar que el colaborador existe
        Colaborador colaborador = colaboradorRepository.findById(turno.getColaborador().getId())
                .orElseThrow(() -> new RuntimeException("El colaborador con ID " + turno.getColaborador().getId() + " no existe"));

        turno.setColaborador(colaborador);
        turno.setEmpresa(colaborador.getEmpresa()); // Aseguramos que la empresa también se asocia correctamente
        return turnoRepository.save(turno); // Guardamos el turno y lo retornamos
    }

    public Turno updateTurno(Long id, Turno updatedTurno) {
        return turnoRepository.findById(id).map(turno -> {
            Optional<Colaborador> colaboradorOpt = colaboradorRepository.findById(updatedTurno.getColaborador().getId());
            if (colaboradorOpt.isEmpty()) {
                throw new RuntimeException("Colaborador con ID " + updatedTurno.getColaborador().getId() + " no existe");
            }
            turno.setColaborador(colaboradorOpt.get());
            turno.setFecha(updatedTurno.getFecha());
            turno.setHoraEntrada(updatedTurno.getHoraEntrada());
            turno.setHoraSalida(updatedTurno.getHoraSalida());
            return turnoRepository.save(turno);
        }).orElseThrow(() -> new RuntimeException("Turno no encontrado"));
    }

    public void deleteTurno(Long id) {
        turnoRepository.deleteById(id);
    }

    // Métodos privados
    private LocalDate getInicioSemana(String fecha) {
        LocalDate parsedDate = LocalDate.parse(fecha);
        return parsedDate.with(java.time.DayOfWeek.MONDAY);
    }

    public TurnoDTO convertToDTO(Turno turno) {
        return new TurnoDTO(
                turno.getId(),
                turno.getColaborador() != null ? turno.getColaborador().getId() : null, // Agregar colaboradorId
                turno.getColaborador() != null ? turno.getColaborador().getNombre() : "Sin Nombre",
                turno.getColaborador() != null ? turno.getColaborador().getDni() : "Sin DNI",
                turno.getEmpresa() != null ? turno.getEmpresa().getNombre() : "Sin Empresa",
                turno.getFecha(),
                turno.getHoraEntrada(),
                turno.getHoraSalida(),
                turno.getHorasTrabajadas()
        );
    }
}
