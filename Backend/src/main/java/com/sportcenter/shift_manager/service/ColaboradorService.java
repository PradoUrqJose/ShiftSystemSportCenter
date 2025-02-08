package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.dto.EmpresaDTO;
import com.sportcenter.shift_manager.service.CloudinaryService;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.sportcenter.shift_manager.config.ImageController.IMAGE_DIRECTORY;

@Service
public class ColaboradorService {
    private final ColaboradorRepository colaboradorRepository;
    private final EmpresaRepository empresaRepository;
    private final CloudinaryService cloudinaryService;

    // Ruta de almacenamiento de la imagen
    private static final String IMAGE_URL_BASE = "http://localhost:8080/images/";

    public ColaboradorService(ColaboradorRepository colaboradorRepository, EmpresaRepository empresaRepository, CloudinaryService cloudinaryService) {
        this.colaboradorRepository = colaboradorRepository;
        this.empresaRepository = empresaRepository;
        this.cloudinaryService = cloudinaryService;
    }

    // Guardar un nuevo colaborador
    public Colaborador saveColaborador(ColaboradorDTO colaboradorDTO, MultipartFile file) throws IOException {
        // Validar existencia de empresa
        Empresa empresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        // Validar duplicados de email, DNI y Nombre + Apellido
        if (colaboradorRepository.findByEmail(colaboradorDTO.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un colaborador con el email: " + colaboradorDTO.getEmail());
        }
        if (colaboradorRepository.findByDni(colaboradorDTO.getDni()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un colaborador con el DNI: " + colaboradorDTO.getDni());
        }
        if (colaboradorRepository.findByNombreAndApellido(colaboradorDTO.getNombre(), colaboradorDTO.getApellido()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un colaborador con el nombre y apellido: "
                    + colaboradorDTO.getNombre() + " " + colaboradorDTO.getApellido());
        }

        // Crear nuevo colaborador
        Colaborador colaborador = new Colaborador();
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setApellido(colaboradorDTO.getApellido());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setTelefono(colaboradorDTO.getTelefono());
        colaborador.setEmail(colaboradorDTO.getEmail());
        colaborador.setHabilitado(colaboradorDTO.isHabilitado());
        colaborador.setEmpresa(empresa);

        // Subir imagen a Cloudinary
        if (file != null && !file.isEmpty()) {
            validarImagen(file);
            String imageUrl = cloudinaryService.uploadImage(file);
            colaborador.setFotoUrl(imageUrl);
        }

        return colaboradorRepository.save(colaborador);
    }

    // Método para validar la imagen
    private void validarImagen(MultipartFile file) {
        if (file.getSize() > 1048576) { // 1 MB
            throw new RuntimeException("La foto debe ser menor a 1 MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Solo se permiten archivos de imagen.");
        }
    }

    // Genera un nombre único para la imagen
    private String generateNewFileName(String nombre, String apellido, String originalFileName) {
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String uniqueId = UUID.randomUUID().toString();
        return "colaborador_" + nombre + "_" + apellido + "_" + uniqueId + extension;
    }

    // Obtener todos los colaboradores
    public List<ColaboradorDTO> getAllColaboradores() {
        return colaboradorRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Obtener colaboradores por empresa
    public List<ColaboradorDTO> getColaboradoresByEmpresa(Long empresaId) {
        return colaboradorRepository.findByEmpresaId(empresaId).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Actualizar un colaborador
    public Colaborador updateColaborador(Long id, ColaboradorDTO colaboradorDTO, MultipartFile file) throws IOException {
        // Buscar colaborador existente
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));
        
        // Validar existencia de empresa
        Empresa nuevaEmpresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        // Validar duplicados (excepto si es el mismo usuario)
        colaboradorRepository.findByEmail(colaboradorDTO.getEmail())
                .filter(c -> !c.getId().equals(id))
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Ya existe un colaborador con el email: " + colaboradorDTO.getEmail());
                });

        colaboradorRepository.findByDni(colaboradorDTO.getDni())
                .filter(c -> !c.getId().equals(id))
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Ya existe un colaborador con el DNI: " + colaboradorDTO.getDni());
                });

        colaboradorRepository.findByNombreAndApellido(colaboradorDTO.getNombre(), colaboradorDTO.getApellido())
                .filter(c -> !c.getId().equals(id))
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Ya existe un colaborador con el nombre y apellido: "
                            + colaboradorDTO.getNombre() + " " + colaboradorDTO.getApellido());
                });

        // Actualizar datos
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setApellido(colaboradorDTO.getApellido());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setTelefono(colaboradorDTO.getTelefono());
        colaborador.setEmail(colaboradorDTO.getEmail());
        colaborador.setEmpresa(nuevaEmpresa);
        colaborador.setHabilitado(colaboradorDTO.isHabilitado());

        // Manejo de imagen (si se proporciona)
        if (file != null && !file.isEmpty()) {
            validarImagen(file);

            // Eliminar imagen anterior en Cloudinary (si existía)
            if (colaborador.getFotoUrl() != null) {
                String publicId = getPublicIdFromUrl(colaborador.getFotoUrl());
                cloudinaryService.deleteImage(publicId);
            }

            // Subir nueva imagen a Cloudinary
            String imageUrl = cloudinaryService.uploadImage(file);
            colaborador.setFotoUrl(imageUrl);
        }

        return colaboradorRepository.save(colaborador);
    }

    // Extrae el public_id de la URL de Cloudinary
    private String getPublicIdFromUrl(String imageUrl) {
        return imageUrl.substring(imageUrl.lastIndexOf("/") + 1, imageUrl.lastIndexOf("."));
    }

    // Eliminar un colaborador
    public void deleteColaborador(Long id) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        // Al eliminar al colaborador, los turnos anteriores no se verán afectados
        colaboradorRepository.delete(colaborador);
    }

    public Colaborador toggleHabilitacionColaborador(Long id, boolean habilitado) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Colaborador con ID " + id + " no encontrado"));
        colaborador.setHabilitado(habilitado);
        return colaboradorRepository.save(colaborador);
    }

    public List<ColaboradorDTO> getColaboradoresPorHabilitacion(boolean habilitado) {
        return colaboradorRepository.findByHabilitado(habilitado).stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Convertir Colaborador a ColaboradorDTO
    public ColaboradorDTO convertToDTO(Colaborador colaborador) {
        return new ColaboradorDTO(
                colaborador.getId(),
                colaborador.getNombre(),
                colaborador.getApellido(), // Nuevo campo
                colaborador.getDni(),
                colaborador.getTelefono(), // Nuevo campo
                colaborador.getEmail(),    // Nuevo campo
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getId() : null,
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getNombre() : "N/A",
                colaborador.getFotoUrl(),      // Nuevo campo
                colaborador.isHabilitado()
        );
    }
}
