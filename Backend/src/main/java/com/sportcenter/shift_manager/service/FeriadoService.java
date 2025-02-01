package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.model.Feriado;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
public class FeriadoService {

    // Lista fija de feriados
    private final List<Feriado> feriados = Arrays.asList(
            new Feriado(LocalDate.of(2025, 1, 1), "Año Nuevo"),
            new Feriado(LocalDate.of(2025, 4, 17), "Jueves Santo"),
            new Feriado(LocalDate.of(2025, 4, 18), "Viernes Santo"),
            new Feriado(LocalDate.of(2025, 5, 1), "Día del Trabajo"),
            new Feriado(LocalDate.of(2025, 6, 7), "Batalla de Arica y Día de la Bandera"),
            new Feriado(LocalDate.of(2025, 6, 29), "Día de San Pedro y San Pablo"),
            new Feriado(LocalDate.of(2025, 7, 23), "Día de la Fuerza Aérea del Perú"),
            new Feriado(LocalDate.of(2025, 7, 28), "Fiestas Patrias"),
            new Feriado(LocalDate.of(2025, 7, 29), "Fiestas Patrias"),
            new Feriado(LocalDate.of(2025, 8, 6), "Batalla de Junín"),
            new Feriado(LocalDate.of(2025, 8, 30), "Santa Rosa de Lima"),
            new Feriado(LocalDate.of(2025, 10, 8), "Combate de Angamos"),
            new Feriado(LocalDate.of(2025, 11, 1), "Día de Todos los Santos"),
            new Feriado(LocalDate.of(2025, 12, 8), "Inmaculada Concepción"),
            new Feriado(LocalDate.of(2025, 12, 9), "Batalla de Ayacucho"),
            new Feriado(LocalDate.of(2025, 12, 25), "Navidad")
    );

    // Método para obtener todos los feriados
    public List<Feriado> getAllFeriados() {
        return feriados;
    }

    // Método para verificar si una fecha es feriado
    public boolean isFeriado(LocalDate fecha) {
        return feriados.stream().anyMatch(feriado -> feriado.getFecha().equals(fecha));
    }
}