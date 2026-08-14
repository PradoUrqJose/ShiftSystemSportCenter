package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.FeriadoDTO;
import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.Feriado;
import com.sportcenter.shift_manager.repository.FeriadoRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
public class FeriadoService {
    private static final Logger log = LoggerFactory.getLogger(FeriadoService.class);

    private final FeriadoRepository feriadoRepository;

    public FeriadoService(FeriadoRepository feriadoRepository) {
        this.feriadoRepository = feriadoRepository;
    }

    // Sin @Transactional: un @PostConstruct corre directo sobre la instancia
    // del bean, antes de que el proxy transaccional de Spring esté armado,
    // así que la anotación acá no tenía ningún efecto real (saveAll/count ya
    // son transaccionales por sí solos vía Spring Data). Se saca para no
    // sugerir una garantía que no existe.
    @PostConstruct
    public void initializeFeriados() {
        if (feriadoRepository.count() == 0) {
            List<Feriado> feriadosIniciales = Arrays.asList(
                    // 2025
                    new Feriado(null, LocalDate.of(2025, 1, 1), "Año Nuevo"),
                    new Feriado(null, LocalDate.of(2025, 4, 17), "Jueves Santo"),
                    new Feriado(null, LocalDate.of(2025, 4, 18), "Viernes Santo"),
                    new Feriado(null, LocalDate.of(2025, 5, 1), "Día del Trabajo"),
                    new Feriado(null, LocalDate.of(2025, 6, 7), "Batalla de Arica y Día de la Bandera"),
                    new Feriado(null, LocalDate.of(2025, 6, 29), "Día de San Pedro y San Pablo"),
                    new Feriado(null, LocalDate.of(2025, 7, 23), "Día de la Fuerza Aérea del Perú"),
                    new Feriado(null, LocalDate.of(2025, 7, 28), "Fiestas Patrias"),
                    new Feriado(null, LocalDate.of(2025, 7, 29), "Fiestas Patrias"),
                    new Feriado(null, LocalDate.of(2025, 8, 6), "Batalla de Junín"),
                    new Feriado(null, LocalDate.of(2025, 8, 30), "Santa Rosa de Lima"),
                    new Feriado(null, LocalDate.of(2025, 10, 8), "Combate de Angamos"),
                    new Feriado(null, LocalDate.of(2025, 11, 1), "Día de Todos los Santos"),
                    new Feriado(null, LocalDate.of(2025, 12, 8), "Inmaculada Concepción"),
                    new Feriado(null, LocalDate.of(2025, 12, 9), "Batalla de Ayacucho"),
                    new Feriado(null, LocalDate.of(2025, 12, 25), "Navidad"),
                    // 2026 — sin esto, isFeriado() devuelve false en silencio para
                    // todo el año actual (el seed original nunca se actualizó).
                    // A partir de acá, usar el CRUD (POST/PUT/DELETE /api/feriados)
                    // en vez de tocar este código cada año.
                    new Feriado(null, LocalDate.of(2026, 1, 1), "Año Nuevo"),
                    new Feriado(null, LocalDate.of(2026, 4, 2), "Jueves Santo"),
                    new Feriado(null, LocalDate.of(2026, 4, 3), "Viernes Santo"),
                    new Feriado(null, LocalDate.of(2026, 5, 1), "Día del Trabajo"),
                    new Feriado(null, LocalDate.of(2026, 6, 7), "Batalla de Arica y Día de la Bandera"),
                    new Feriado(null, LocalDate.of(2026, 6, 29), "Día de San Pedro y San Pablo"),
                    new Feriado(null, LocalDate.of(2026, 7, 23), "Día de la Fuerza Aérea del Perú"),
                    new Feriado(null, LocalDate.of(2026, 7, 28), "Fiestas Patrias"),
                    new Feriado(null, LocalDate.of(2026, 7, 29), "Fiestas Patrias"),
                    new Feriado(null, LocalDate.of(2026, 8, 6), "Batalla de Junín"),
                    new Feriado(null, LocalDate.of(2026, 8, 30), "Santa Rosa de Lima"),
                    new Feriado(null, LocalDate.of(2026, 10, 8), "Combate de Angamos"),
                    new Feriado(null, LocalDate.of(2026, 11, 1), "Día de Todos los Santos"),
                    new Feriado(null, LocalDate.of(2026, 12, 8), "Inmaculada Concepción"),
                    new Feriado(null, LocalDate.of(2026, 12, 9), "Batalla de Ayacucho"),
                    new Feriado(null, LocalDate.of(2026, 12, 25), "Navidad")
            );
            feriadoRepository.saveAll(feriadosIniciales);
            log.info("Feriados iniciales cargados: {}", feriadosIniciales.size());
        }
    }

    public List<Feriado> getAllFeriados() {
        return feriadoRepository.findAll();
    }

    public boolean isFeriado(LocalDate fecha) {
        return feriadoRepository.existsByFecha(fecha);
    }

    @Transactional
    public Feriado crearFeriado(FeriadoDTO dto) {
        if (feriadoRepository.existsByFecha(dto.getFecha())) {
            throw new IllegalArgumentException("Ya existe un feriado registrado para el " + dto.getFecha());
        }
        Feriado feriado = new Feriado(null, dto.getFecha(), dto.getDescripcion());
        Feriado guardado = feriadoRepository.save(feriado);
        log.info("Feriado creado: id={}, fecha={}", guardado.getId(), guardado.getFecha());
        return guardado;
    }

    @Transactional
    public Feriado actualizarFeriado(Long id, FeriadoDTO dto) {
        Feriado feriado = feriadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feriado con ID " + id + " no encontrado"));

        feriadoRepository.findByFecha(dto.getFecha())
                .filter(f -> !f.getId().equals(id))
                .ifPresent(f -> {
                    throw new IllegalArgumentException("Ya existe un feriado registrado para el " + dto.getFecha());
                });

        feriado.setFecha(dto.getFecha());
        feriado.setDescripcion(dto.getDescripcion());
        Feriado actualizado = feriadoRepository.save(feriado);
        log.info("Feriado actualizado: id={}", id);
        return actualizado;
    }

    @Transactional
    public void eliminarFeriado(Long id) {
        Feriado feriado = feriadoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feriado con ID " + id + " no encontrado"));
        feriadoRepository.delete(feriado);
        log.info("Feriado eliminado: id={}", id);
    }
}