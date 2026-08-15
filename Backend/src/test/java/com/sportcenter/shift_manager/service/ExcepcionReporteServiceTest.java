package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ReporteExcepcionesDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.FeriadoRepository;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExcepcionReporteServiceTest {

    @Mock private TurnoRepository turnoRepository;
    @Mock private FeriadoRepository feriadoRepository;

    private ExcepcionReporteService service;

    @BeforeEach
    void setUp() {
        service = new ExcepcionReporteService(turnoRepository, feriadoRepository);
    }

    @Test
    void detectaRiesgosDiariosSemanalesYDeDescansoSinDeclararInfraccion() {
        LocalDate lunes = LocalDate.of(2026, 7, 6);
        List<Turno> turnos = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            turnos.add(turno((long) i + 1, lunes.plusDays(i), LocalTime.of(9, 0), LocalTime.of(18, 0)));
        }
        prepararRepositorios(turnos);

        ReporteExcepcionesDTO resultado = service.getExcepciones(
                lunes, lunes.plusDays(6), null, 8.0, 12.0, 90);

        assertThat(resultado.getErrores()).isZero();
        assertThat(resultado.getRiesgos()).isEqualTo(9);
        assertThat(resultado.getExcepciones()).extracting(e -> e.getCodigo())
                .containsOnlyOnce("SEMANA_SOBRE_48_HORAS", "SIN_DESCANSO_24_HORAS")
                .filteredOn("JORNADA_SOBRE_UMBRAL"::equals)
                .hasSize(7);
        assertThat(resultado.getExcepciones())
                .filteredOn(e -> e.getCodigo().equals("SEMANA_SOBRE_48_HORAS"))
                .singleElement()
                .satisfies(e -> assertThat(e.getDetalle()).contains("conciliarse"));
    }

    @Test
    void distingueDuplicadoSolapamientoFeriadoYTurnoPartido() {
        LocalDate fecha = LocalDate.of(2026, 7, 20);
        Turno primero = turno(1L, fecha, LocalTime.of(9, 0), LocalTime.of(13, 0));
        primero.setEsFeriado(true);
        Turno segundo = turno(2L, fecha, LocalTime.of(9, 0), LocalTime.of(13, 0));
        prepararRepositorios(List.of(primero, segundo));

        ReporteExcepcionesDTO resultado = service.getExcepciones(fecha, fecha, null, null, null, null);

        assertThat(resultado.getExcepciones()).extracting(e -> e.getCodigo())
                .contains("TURNO_DUPLICADO", "TURNOS_SOLAPADOS", "FERIADO_INCONSISTENTE", "TURNO_PARTIDO");
        assertThat(resultado.getErrores()).isEqualTo(3);
        assertThat(resultado.getInformativos()).isEqualTo(1);
    }

    @Test
    void noSumaComoUnaJornadaTurnosDeEmpresasHistoricasDistintas() {
        LocalDate fecha = LocalDate.of(2026, 7, 20);
        Turno empresaA = turno(1L, fecha, LocalTime.of(8, 0), LocalTime.of(13, 0));
        Turno empresaB = turno(2L, fecha, LocalTime.of(14, 0), LocalTime.of(19, 0));
        empresaB.getEmpresa().setId(20L);
        empresaB.getEmpresa().setNombre("Empresa histórica B");
        prepararRepositorios(List.of(empresaA, empresaB));

        ReporteExcepcionesDTO resultado = service.getExcepciones(fecha, fecha, null, null, null, null);

        assertThat(resultado.getExcepciones())
                .noneMatch(e -> e.getCodigo().equals("JORNADA_SOBRE_UMBRAL"));
    }

    @Test
    void aplicaElFiltroDeEmpresaHistoricaEnLaConsulta() {
        LocalDate fecha = LocalDate.of(2026, 7, 20);
        Turno turno = turno(1L, fecha, LocalTime.of(8, 0), LocalTime.of(13, 0));
        when(turnoRepository.findByEmpresa_IdAndFechaBetween(eq(10L), any(), any())).thenReturn(List.of(turno));
        when(turnoRepository.findByEmpresa_IdAndFechaIsNull(10L)).thenReturn(List.of());
        when(feriadoRepository.findByFechaBetween(any(), any())).thenReturn(List.of());

        service.getExcepciones(fecha, fecha, 10L, null, null, null);

        verify(turnoRepository).findByEmpresa_IdAndFechaBetween(eq(10L), any(), any());
    }

    @Test
    void rechazaParametrosInvalidos() {
        LocalDate fecha = LocalDate.of(2026, 8, 1);

        assertThatThrownBy(() -> service.getExcepciones(fecha.plusDays(1), fecha, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("desde");
        assertThatThrownBy(() -> service.getExcepciones(fecha, fecha, null, 8.0, 8.0, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("extrema");
        assertThatThrownBy(() -> service.getExcepciones(fecha, fecha, null, null, null, 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("horizonte");
    }

    private void prepararRepositorios(List<Turno> turnos) {
        when(turnoRepository.findByFechaBetween(any(), any())).thenReturn(turnos);
        when(turnoRepository.findByFechaIsNull()).thenReturn(List.of());
        when(feriadoRepository.findByFechaBetween(any(), any())).thenReturn(List.of());
    }

    private Turno turno(Long id, LocalDate fecha, LocalTime entrada, LocalTime salida) {
        Colaborador colaborador = new Colaborador();
        colaborador.setId(7L);
        colaborador.setDni("12345678");
        colaborador.setNombre("Ana");
        colaborador.setApellido("Prueba");
        colaborador.setHabilitado(true);

        Empresa empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombre("Empresa histórica A");

        Tienda tienda = new Tienda();
        tienda.setId(20L);
        tienda.setNombre("Tienda prueba");

        Turno turno = new Turno();
        turno.setId(id);
        turno.setFecha(fecha);
        turno.setHoraEntrada(entrada);
        turno.setHoraSalida(salida);
        turno.setColaborador(colaborador);
        turno.setEmpresa(empresa);
        turno.setTienda(tienda);
        return turno;
    }
}
