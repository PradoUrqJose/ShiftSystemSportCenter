package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class TurnoService {
    private final TurnoRepository turnoRepository;
    private final ColaboradorRepository colaboradorRepository;

    public TurnoService(TurnoRepository turnoRepository, ColaboradorRepository colaboradorRepository) {
        this.turnoRepository = turnoRepository;
        this.colaboradorRepository = colaboradorRepository;
    }

    public List<Turno> getTurnosByColaboradorId(Long colaboradorId) {
        return turnoRepository.findByColaborador_Id(colaboradorId);
    }

    public List<Turno> getTurnosPorSemana(String fecha) {
        try {
            LocalDate parsedDate = LocalDate.parse(fecha);
            LocalDate inicioSemana = parsedDate.with(java.time.DayOfWeek.MONDAY);
            LocalDate finSemana = inicioSemana.plusDays(6);
            return turnoRepository.findByFechaBetween(inicioSemana, finSemana);
        } catch (Exception e) {
            throw new RuntimeException("Error al parsear la fecha: " + fecha, e);
        }
    }

    public Turno saveTurno(Turno turno) {
        Optional<Colaborador> colaboradorOpt = colaboradorRepository.findById(turno.getColaborador().getId());
        if (colaboradorOpt.isEmpty()) {
            throw new RuntimeException("El colaborador con ID " + turno.getColaborador().getId() + " no existe");
        }
        turno.setColaborador(colaboradorOpt.get());
        return turnoRepository.save(turno);
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
}

