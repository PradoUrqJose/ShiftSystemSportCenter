package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.TurnoPredeterminadoDTO;
import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.TurnoPredeterminado;
import com.sportcenter.shift_manager.repository.TurnoPredeterminadoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TurnoPredeterminadoService {
    private static final Logger log = LoggerFactory.getLogger(TurnoPredeterminadoService.class);

    private final TurnoPredeterminadoRepository repository;

    public TurnoPredeterminadoService(TurnoPredeterminadoRepository repository) {
        this.repository = repository;
    }

    public List<TurnoPredeterminadoDTO> getAll() {
        return repository.findAllByOrderByHoraEntradaAscHoraSalidaAsc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public TurnoPredeterminadoDTO create(TurnoPredeterminadoDTO dto) {
        validarHorario(dto);

        TurnoPredeterminado entity = new TurnoPredeterminado();
        entity.setHoraEntrada(dto.getHoraEntrada());
        entity.setHoraSalida(dto.getHoraSalida());
        TurnoPredeterminado saved = repository.save(entity);
        log.info("Plantilla de turno creada: id={}, {}-{}", saved.getId(), saved.getHoraEntrada(), saved.getHoraSalida());
        return convertToDTO(saved);
    }

    @Transactional
    public void delete(Long id) {
        TurnoPredeterminado entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plantilla de turno con ID " + id + " no encontrada"));
        repository.delete(entity);
        log.info("Plantilla de turno eliminada: id={}", id);
    }

    private void validarHorario(TurnoPredeterminadoDTO dto) {
        if (dto.getHoraEntrada() != null && dto.getHoraSalida() != null
                && !dto.getHoraEntrada().isBefore(dto.getHoraSalida())) {
            throw new IllegalArgumentException("La hora de entrada debe ser anterior a la hora de salida");
        }
    }

    private TurnoPredeterminadoDTO convertToDTO(TurnoPredeterminado entity) {
        return new TurnoPredeterminadoDTO(entity.getId(), entity.getHoraEntrada(), entity.getHoraSalida());
    }
}
