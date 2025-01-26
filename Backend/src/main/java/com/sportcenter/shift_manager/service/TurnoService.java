package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.TurnoDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TiendaRepository;
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
    private final TiendaRepository tiendaRepository;

    // Constructor
    public TurnoService(TurnoRepository turnoRepository, ColaboradorRepository colaboradorRepository, TiendaRepository tiendaRepository) {
        this.turnoRepository = turnoRepository;
        this.colaboradorRepository = colaboradorRepository;
        this.tiendaRepository = tiendaRepository;
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

        turno.setColaborador(colaborador);
        turno.setEmpresa(colaborador.getEmpresa()); // Aseguramos que la empresa también se asocia correctamente
        turno.setTienda(tienda);
        return turnoRepository.save(turno); // Guardamos el turno y lo retornamos
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
                turno.getTienda() != null ? turno.getTienda().getId() : null, // Agregar tiendaId
                turno.getTienda() != null ? turno.getTienda().getNombre() : "Sin Tienda",
                turno.getFecha(),
                turno.getHoraEntrada(),
                turno.getHoraSalida(),
                turno.getHorasTrabajadas()
        );
    }
}
