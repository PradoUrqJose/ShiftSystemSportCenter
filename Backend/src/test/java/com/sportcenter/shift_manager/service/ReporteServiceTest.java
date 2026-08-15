package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.PreliquidacionMensualDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.TurnoDiarioAgregado;
import com.sportcenter.shift_manager.repository.TurnoRepository;
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
class ReporteServiceTest {

    @Mock
    private TurnoRepository turnoRepository;
    @Mock
    private ColaboradorRepository colaboradorRepository;
    @Mock
    private TurnoService turnoService;

    private ReporteService reporteService;

    @BeforeEach
    void setUp() {
        reporteService = new ReporteService(turnoRepository, colaboradorRepository, turnoService);
    }

    @Test
    void separaLaPreliquidacionPorEmpresaHistoricaDelTurno() {
        TurnoDiarioAgregado empresaA = agregadoDiario(7L, 10L, "Empresa histórica A", 480.0);
        TurnoDiarioAgregado empresaB = agregadoDiario(7L, 20L, "Empresa histórica B", 360.0);

        when(turnoRepository.sumarizarPorColaboradorYDia(any(), any(), eq(null)))
                .thenReturn(List.of(empresaA, empresaB));
        when(turnoRepository.sumarizarPorColaboradorYTienda(any(), any(), eq(null)))
                .thenReturn(List.of());
        when(turnoRepository.findByColaborador_IdInAndFechaBetween(any(), any(), any()))
                .thenReturn(List.of());

        Colaborador colaborador = new Colaborador();
        colaborador.setId(7L);
        colaborador.setDni("12345678");
        colaborador.setNombre("Ana");
        colaborador.setApellido("Prueba");
        when(colaboradorRepository.findAllById(any())).thenReturn(List.of(colaborador));

        List<PreliquidacionMensualDTO> resultado = reporteService
                .getPreliquidacionMensual(8, 2026, null, 8.0);

        assertThat(resultado).hasSize(2);
        assertThat(resultado)
                .extracting(PreliquidacionMensualDTO::getEmpresaId)
                .containsExactlyInAnyOrder(10L, 20L);
        assertThat(resultado)
                .extracting(PreliquidacionMensualDTO::getNombreEmpresa)
                .containsExactlyInAnyOrder("Empresa histórica A", "Empresa histórica B");
        assertThat(resultado)
                .extracting(PreliquidacionMensualDTO::getTotalHorasMes)
                .containsExactlyInAnyOrder(8.0, 6.0);
    }

    @Test
    void rechazaParametrosQueProducirianUnaPreliquidacionInvalida() {
        assertThatThrownBy(() -> reporteService.getPreliquidacionMensual(13, 2026, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mes");
        assertThatThrownBy(() -> reporteService.getPreliquidacionMensual(8, 1999, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("año");
        assertThatThrownBy(() -> reporteService.getPreliquidacionMensual(8, 2026, null, 0.0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("umbral");
    }

    private TurnoDiarioAgregado agregadoDiario(
            Long colaboradorId,
            Long empresaId,
            String nombreEmpresa,
            Double minutosNetos
    ) {
        return new TurnoDiarioAgregado() {
            @Override public Long getColaboradorId() { return colaboradorId; }
            @Override public Long getEmpresaId() { return empresaId; }
            @Override public String getNombreEmpresa() { return nombreEmpresa; }
            @Override public LocalDate getFecha() { return LocalDate.of(2026, 8, 3); }
            @Override public Integer getCantidadTurnos() { return 1; }
            @Override public Double getMinutosNetos() { return minutosNetos; }
            @Override public Boolean getEsFeriado() { return false; }
        };
    }
}
