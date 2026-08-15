package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ExcepcionReporteDTO;
import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.dto.ResumenReporteDTO;
import com.sportcenter.shift_manager.repository.TurnoDiarioAgregado;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import com.sportcenter.shift_manager.repository.TurnoTiendaAgregado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumenReporteServiceTest {

    @Mock private TurnoRepository turnoRepository;
    @Mock private ExcepcionReporteService excepcionReporteService;

    private ResumenReporteService service;

    @BeforeEach
    void setUp() {
        service = new ResumenReporteService(turnoRepository, excepcionReporteService);
    }

    @Test
    void componeTotalesSemanasTiendasYAtencionSinDuplicarPersonas() {
        LocalDate desde = LocalDate.of(2026, 8, 1);
        LocalDate hasta = LocalDate.of(2026, 8, 9);
        when(turnoRepository.sumarizarPorColaboradorYDia(desde, hasta, null)).thenReturn(List.of(
                dia(7L, desde, 480.0, false),
                dia(8L, LocalDate.of(2026, 8, 3), 360.0, true)
        ));
        when(turnoRepository.sumarizarPorColaboradorYTienda(desde, hasta, null)).thenReturn(List.of(
                tienda(7L, 20L, "Centro", 8.0),
                tienda(8L, 20L, "Centro", 6.0)
        ));
        when(excepcionReporteService.getExcepciones(eq(desde), eq(hasta), eq(null), any(), any(), any()))
                .thenReturn(excepciones(desde, hasta));

        ResumenReporteDTO resultado = service.getResumen(desde, hasta, null, 8.0, 12.0, 90);

        assertThat(resultado.getTotalHorasProgramadas()).isEqualTo(14.0);
        assertThat(resultado.getHorasEnFeriado()).isEqualTo(6.0);
        assertThat(resultado.getColaboradoresProgramados()).isEqualTo(2);
        assertThat(resultado.getColaboradoresConCargaExcepcional()).isEqualTo(1);
        assertThat(resultado.getErroresDatos()).isEqualTo(1);
        assertThat(resultado.getHallazgosPorConciliar()).isEqualTo(3);
        assertThat(resultado.getSemanas()).hasSize(2);
        assertThat(resultado.getSemanas().get(0).getHorasRegulares()).isEqualTo(8.0);
        assertThat(resultado.getSemanas().get(1).getHorasEnFeriado()).isEqualTo(6.0);
        assertThat(resultado.getTiendas()).singleElement().satisfies(tienda -> {
            assertThat(tienda.getHoras()).isEqualTo(14.0);
            assertThat(tienda.getPorcentaje()).isEqualTo(100.0);
        });
        assertThat(resultado.getRequiereAtencion()).extracting(ExcepcionReporteDTO::getSeveridad)
                .containsExactly("ERROR", "RIESGO", "RIESGO");
    }

    @Test
    void conservaSemanasVaciasParaQueLaTendenciaNoEngane() {
        LocalDate desde = LocalDate.of(2026, 8, 1);
        LocalDate hasta = LocalDate.of(2026, 8, 16);
        when(turnoRepository.sumarizarPorColaboradorYDia(desde, hasta, 10L)).thenReturn(List.of());
        when(turnoRepository.sumarizarPorColaboradorYTienda(desde, hasta, 10L)).thenReturn(List.of());
        when(excepcionReporteService.getExcepciones(desde, hasta, 10L, null, null, null))
                .thenReturn(ReporteExcepcionesDTO.builder()
                        .desde(desde).hasta(hasta).umbralHorasDiarias(8).umbralJornadaExtrema(12)
                        .horizonteDias(90).excepciones(List.of()).build());

        ResumenReporteDTO resultado = service.getResumen(desde, hasta, 10L, null, null, null);

        assertThat(resultado.getSemanas()).hasSize(3);
        assertThat(resultado.getSemanas()).allSatisfy(semana ->
                assertThat(semana.getHorasRegulares() + semana.getHorasEnFeriado()).isZero());
    }

    @Test
    void rechazaUnRangoInvertidoAntesDeConsultar() {
        LocalDate fecha = LocalDate.of(2026, 8, 1);

        assertThatThrownBy(() -> service.getResumen(fecha.plusDays(1), fecha, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("desde");
    }

    private ReporteExcepcionesDTO excepciones(LocalDate desde, LocalDate hasta) {
        return ReporteExcepcionesDTO.builder()
                .desde(desde).hasta(hasta)
                .umbralHorasDiarias(8).umbralJornadaExtrema(12).horizonteDias(90)
                .errores(1).riesgos(2).advertencias(1).informativos(1)
                .excepciones(List.of(
                        hallazgo("ERROR", 9L),
                        hallazgo("RIESGO", 7L),
                        hallazgo("RIESGO", 7L),
                        hallazgo("INFORMACION", 8L)
                ))
                .build();
    }

    private ExcepcionReporteDTO hallazgo(String severidad, Long colaboradorId) {
        return ExcepcionReporteDTO.builder()
                .codigo("PRUEBA").severidad(severidad).titulo("Prueba")
                .colaboradorId(colaboradorId).nombreColaborador("Persona")
                .turnoIds(List.of()).build();
    }

    private TurnoDiarioAgregado dia(Long colaboradorId, LocalDate fecha, Double minutos, boolean feriado) {
        return new TurnoDiarioAgregado() {
            @Override public Long getColaboradorId() { return colaboradorId; }
            @Override public Long getEmpresaId() { return 10L; }
            @Override public String getNombreEmpresa() { return "Empresa"; }
            @Override public LocalDate getFecha() { return fecha; }
            @Override public Integer getCantidadTurnos() { return 1; }
            @Override public Double getMinutosNetos() { return minutos; }
            @Override public Boolean getEsFeriado() { return feriado; }
        };
    }

    private TurnoTiendaAgregado tienda(Long colaboradorId, Long tiendaId, String nombre, Double horas) {
        return new TurnoTiendaAgregado() {
            @Override public Long getColaboradorId() { return colaboradorId; }
            @Override public Long getEmpresaId() { return 10L; }
            @Override public Long getTiendaId() { return tiendaId; }
            @Override public String getNombreTienda() { return nombre; }
            @Override public Double getHoras() { return horas; }
        };
    }
}
