package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.model.Feriado;
import com.sportcenter.shift_manager.repository.FeriadoRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
public class FeriadoService {
    private final FeriadoRepository feriadoRepository;

    public FeriadoService(FeriadoRepository feriadoRepository) {
        this.feriadoRepository = feriadoRepository;
    }

    @PostConstruct
    public void initializeFeriados() {
        if (feriadoRepository.count() == 0) {
            List<Feriado> feriadosIniciales = Arrays.asList(
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
                    new Feriado(null, LocalDate.of(2025, 12, 25), "Navidad")
            );
            feriadoRepository.saveAll(feriadosIniciales);
        }
    }

    public List<Feriado> getAllFeriados() {
        return feriadoRepository.findAll();
    }

    public boolean isFeriado(LocalDate fecha) {
        return feriadoRepository.existsByFecha(fecha);
    }
}