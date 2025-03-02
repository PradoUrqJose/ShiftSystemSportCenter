package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
import com.sportcenter.shift_manager.exception.ResourceNotFoundException;
import com.sportcenter.shift_manager.model.Colaborador;
import com.sportcenter.shift_manager.model.Empresa;
import com.sportcenter.shift_manager.model.Puesto;
import com.sportcenter.shift_manager.repository.ColaboradorRepository;
import com.sportcenter.shift_manager.repository.EmpresaRepository;
import com.sportcenter.shift_manager.repository.PuestoRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ColaboradorService {
    private final ColaboradorRepository colaboradorRepository;
    private final EmpresaRepository empresaRepository;
    private final CloudinaryService cloudinaryService;
    private final PuestoRepository puestoRepository; // Nuevo repositorio

    public ColaboradorService(ColaboradorRepository colaboradorRepository, EmpresaRepository empresaRepository, CloudinaryService cloudinaryService, PuestoRepository puestoRepository) {
        this.colaboradorRepository = colaboradorRepository;
        this.empresaRepository = empresaRepository;
        this.cloudinaryService = cloudinaryService;
        this.puestoRepository = puestoRepository;
    }

    // Guardar un nuevo colaborador
    @Transactional
    public Colaborador saveColaborador(ColaboradorDTO colaboradorDTO, MultipartFile file) throws IOException {
        // Validar existencia de empresa
        Empresa empresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

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
        // Nuevos atributos
        colaborador.setFechaNacimiento(colaboradorDTO.getFechaNacimiento());

        // Asignar puesto si se proporciona puestoId
        if (colaboradorDTO.getPuestoId() != null) {
            Puesto puesto = puestoRepository.findById(colaboradorDTO.getPuestoId())
                    .orElseThrow(() -> new RuntimeException("Puesto con ID " + colaboradorDTO.getPuestoId() + " no encontrado"));
            colaborador.setPuesto(puesto);
        }

        // Subir imagen a Cloudinary
        if (file != null && !file.isEmpty()) {
            validarImagen(file);
            String imageUrl = cloudinaryService.uploadImage(file);
            colaborador.setFotoUrl(imageUrl);
        }

        return colaboradorRepository.save(colaborador);
    }

    // Método para validar la imagen (sin cambios)
    private void validarImagen(MultipartFile file) {
        if (file.getSize() > 1048576) { // 1 MB
            throw new RuntimeException("La foto debe ser menor a 1 MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Solo se permiten archivos de imagen.");
        }
    }

    // Obtener todos los colaboradores (sin cambios en la lógica, solo en el DTO)
    public List<ColaboradorDTO> getAllColaboradores() {
        return colaboradorRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Obtener colaboradores por empresa (sin cambios en la lógica, solo en el DTO)
    public List<ColaboradorDTO> getColaboradoresByEmpresa(Long empresaId) {
        return colaboradorRepository.findByEmpresaId(empresaId).stream()
                .map(this::convertToDTO)
                .toList();
    }

    public Colaborador getColaboradorById(Long id) {
        return colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));
    }

    // Actualizar un colaborador
    @Transactional
    public Colaborador updateColaborador(Long id, ColaboradorDTO colaboradorDTO, MultipartFile file) throws IOException {
        // Buscar colaborador existente
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Colaborador con ID " + id + " no encontrado"));

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
        // Nuevos atributos
        colaborador.setFechaNacimiento(colaboradorDTO.getFechaNacimiento());

        // Actualizar puesto si se proporciona puestoId
        if (colaboradorDTO.getPuestoId() != null) {
            Puesto puesto = puestoRepository.findById(colaboradorDTO.getPuestoId())
                    .orElseThrow(() -> new RuntimeException("Puesto con ID " + colaboradorDTO.getPuestoId() + " no encontrado"));
            colaborador.setPuesto(puesto);
        } else {
            colaborador.setPuesto(null); // Permitir quitar el puesto si puestoId es null
        }

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

    // Extrae el public_id de la URL de Cloudinary (sin cambios)
    private String getPublicIdFromUrl(String imageUrl) {
        return imageUrl.substring(imageUrl.lastIndexOf("/") + 1, imageUrl.lastIndexOf("."));
    }

    // Eliminar un colaborador (sin cambios)
    public void deleteColaborador(Long id) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));
        colaboradorRepository.delete(colaborador);
    }

    // Cambiar estado de habilitación (sin cambios)
    @Transactional
    public Colaborador toggleHabilitacionColaborador(Long id, boolean habilitado) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Colaborador con ID " + id + " no encontrado"));
        colaborador.setHabilitado(habilitado);
        return colaboradorRepository.save(colaborador);
    }

    // Obtener colaboradores por habilitación (sin cambios en la lógica, solo en el DTO)
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
                colaborador.getApellido(),
                colaborador.getDni(),
                colaborador.getTelefono(),
                colaborador.getEmail(),
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getId() : null,
                colaborador.getEmpresa() != null ? colaborador.getEmpresa().getNombre() : "N/A",
                colaborador.getFotoUrl(),
                colaborador.isHabilitado(),
                colaborador.getFechaNacimiento(),
                colaborador.getPuesto() != null ? colaborador.getPuesto().getId() : null,
                colaborador.getPuesto() != null ? colaborador.getPuesto().getNombre() : null
        );
    }
}