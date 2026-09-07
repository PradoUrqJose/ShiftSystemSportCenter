package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ProgramacionContableDTO;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.model.Turno;
import com.sportcenter.shift_manager.repository.TurnoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgramacionContableServiceTest {

    @Mock private TurnoRepository turnoRepository;

    private ProgramacionContableService service;

    @BeforeEach
    void setUp() {
        service = new ProgramacionContableService(turnoRepository);
    }

    @Test
    void consolidaResumenYDetalleDecimalConFeriadoAlmuerzoYTurnoPartido() {
        LocalDate desde = LocalDate.of(2026, 7, 1);
        LocalDate hasta = LocalDate.of(2026, 7, 31);
        Turno manana = turno(1L, LocalDate.of(2026, 7, 10), LocalTime.of(8, 0), LocalTime.of(13, 0));
        Turno tarde = turno(2L, LocalDate.of(2026, 7, 10), LocalTime.of(14, 0), LocalTime.of(18, 0));
        Turno feriado = turno(3L, LocalDate.of(2026, 7, 28), LocalTime.of(8, 0), LocalTime.of(17, 0));
        feriado.setEsFeriado(true);
        when(turnoRepository.findByFechaBetween(desde, hasta)).thenReturn(List.of(manana, tarde, feriado));

        ProgramacionContableDTO resultado = service.getProgramacion(desde, hasta, null, List.of(), 8.0);

        assertThat(resultado.getColaboradoresIncluidos()).isEqualTo(1);
        assertThat(resultado.getTurnosIncluidos()).isEqualTo(3);
        assertThat(resultado.getTotalHorasProgramadas()).isEqualTo(17.25);
        assertThat(resultado.getTotalHorasEnFeriado()).isEqualTo(8.25);
        assertThat(resultado.getResumen()).singleElement().satisfies(fila -> {
            assertThat(fila.getDiasProgramados()).isEqualTo(2);
            assertThat(fila.getCantidadTurnos()).isEqualTo(3);
            assertThat(fila.getHorasRegulares()).isEqualTo(9.0);
            assertThat(fila.getHorasEnFeriado()).isEqualTo(8.25);
            assertThat(fila.getHorasSobreUmbralDiario()).isEqualTo(1.25);
            assertThat(fila.getDiasConTurnoPartido()).isEqualTo(1);
            assertThat(fila.getRucEmpresa()).isEqualTo("20123456789");
        });
        assertThat(resultado.getTurnos()).filteredOn(t -> t.getTurnoId() == 3L).singleElement()
                .satisfies(t -> {
                    assertThat(t.isFeriado()).isTrue();
                    assertThat(t.isDescuentoAlmuerzo()).isTrue();
                    assertThat(t.getHorasProgramadas()).isEqualTo(8.25);
                });
        assertThat(resultado.getTurnos()).filteredOn(t -> t.getFecha().equals(LocalDate.of(2026, 7, 10)))
                .allSatisfy(t -> assertThat(t.isTurnoPartido()).isTrue());
    }

    @Test
    void separaLaMismaPersonaPorEmpresaHistoricaSinDuplicarElConteoDePersonas() {
        LocalDate fecha = LocalDate.of(2026, 7, 10);
        Turno empresaA = turno(1L, fecha, LocalTime.of(8, 0), LocalTime.of(12, 0));
        Turno empresaB = turno(2L, fecha, LocalTime.of(13, 0), LocalTime.of(17, 0));
        empresaB.setEmpresa(empresa(20L, "Empresa B", "20987654321"));
        when(turnoRepository.findByFechaBetween(fecha, fecha)).thenReturn(List.of(empresaA, empresaB));

        ProgramacionContableDTO resultado = service.getProgramacion(
                fecha, fecha, null, List.of(), null);

        assertThat(resultado.getColaboradoresIncluidos()).isEqualTo(1);
        assertThat(resultado.getResumen()).extracting(f -> f.getNombreEmpresa())
                .containsExactly("Empresa A", "Empresa B");
        assertThat(resultado.getResumen()).allSatisfy(fila ->
                assertThat(fila.getDiasConTurnoPartido()).isEqualTo(1));
        assertThat(resultado.getTurnos()).allSatisfy(turno ->
                assertThat(turno.isTurnoPartido()).isTrue());
    }

    @Test
    void usaLosFiltrosCombinadosYRechazaParametrosInvalidos() {
        LocalDate fecha = LocalDate.of(2026, 7, 10);
        when(turnoRepository.findByColaborador_IdInAndEmpresa_IdAndFechaBetween(
                eq(List.of(7L)), eq(10L), eq(fecha), eq(fecha))).thenReturn(List.of());

        ProgramacionContableDTO resultado = service.getProgramacion(fecha, fecha, 10L, List.of(7L, 7L), 8.0);

        assertThat(resultado.getTurnos()).isEmpty();
        assertThatThrownBy(() -> service.getProgramacion(fecha.plusDays(1), fecha, null, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("desde");
        assertThatThrownBy(() -> service.getProgramacion(fecha, fecha, null, null, 0.0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("umbral");
        assertThatThrownBy(() -> service.getProgramacion(fecha, fecha.plusYears(2).plusDays(1), null, null, null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("dos años");
    }

    private Turno turno(Long id, LocalDate fecha, LocalTime entrada, LocalTime salida) {
        Colaborador colaborador = new Colaborador();
        colaborador.setId(7L);
        colaborador.setDni("12345678");
        colaborador.setNombre("Ana");
        colaborador.setApellido("Prueba");

        Tienda tienda = new Tienda();
        tienda.setId(30L);
        tienda.setNombre("Tienda Centro");

        Turno turno = new Turno();
        turno.setId(id);
        turno.setFecha(fecha);
        turno.setHoraEntrada(entrada);
        turno.setHoraSalida(salida);
        turno.setColaborador(colaborador);
        turno.setEmpresa(empresa(10L, "Empresa A", "20123456789"));
        turno.setTienda(tienda);
        // tomoAlmuerzo ya no se calcula solo — se persiste (ver Turno.java).
        // Este helper construye la entidad directo, sin pasar por
        // TurnoService.aplicarDatosTurno, así que replica acá la misma
        // regla por defecto que aplicaría el servicio.
        turno.setTomoAlmuerzo(Turno.calcularAlmuerzoPorDefecto(entrada, salida));
        return turno;
    }

    private Empresa empresa(Long id, String nombre, String ruc) {
        Empresa empresa = new Empresa();
        empresa.setId(id);
        empresa.setNombre(nombre);
        empresa.setRuc(ruc);
        return empresa;
    }
}
