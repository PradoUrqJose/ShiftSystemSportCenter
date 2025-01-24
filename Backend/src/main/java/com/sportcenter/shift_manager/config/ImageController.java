package com.sportcenter.shift_manager.config;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;

@RestController
public class ImageController {

    // Ruta a la carpeta donde se almacenan las imágenes
    public static final String IMAGE_DIRECTORY = "C:/Users/josep/Documents/ProyectosPersonales/ShiftSystemSportCenter/images/";

    @GetMapping("/images/{filename}")
    public Resource getImage(@PathVariable String filename) {
        File file = new File(IMAGE_DIRECTORY + filename);
        return new FileSystemResource(file);
    }
}