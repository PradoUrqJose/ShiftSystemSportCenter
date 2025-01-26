package com.sportcenter.shift_manager.controller;

import com.sportcenter.shift_manager.model.Tienda;
import com.sportcenter.shift_manager.service.TiendaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tiendas")
@CrossOrigin(origins = "http://localhost:4200")
public class TiendaController {
    private final TiendaService tiendaService;

    public TiendaController(TiendaService tiendaService) {
        this.tiendaService = tiendaService;
    }

    @PostMapping
    public Tienda createTienda(@RequestBody Tienda tienda) {
        return tiendaService.saveTienda(tienda);
    }

    @GetMapping
    public List<Tienda> getAllTiendas() {
        return tiendaService.getAllTiendas();
    }

    @GetMapping("/{id}")
    public Tienda getTiendaById(@PathVariable Long id) {
        return tiendaService.getTiendaById(id);
    }

    @PutMapping("/{id}")
    public Tienda updateTienda(@PathVariable Long id, @RequestBody Tienda tienda) {
        return tiendaService.updateTienda(id, tienda);
    }

    @DeleteMapping("/{id}")
    public void deleteTienda(@PathVariable Long id) {
        tiendaService.deleteTienda(id);
    }
}