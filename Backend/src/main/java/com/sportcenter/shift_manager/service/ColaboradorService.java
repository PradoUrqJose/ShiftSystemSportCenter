package com.sportcenter.shift_manager.service;

import com.sportcenter.shift_manager.dto.ColaboradorDTO;
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
import java.util.stream.Collectors;

import static com.sportcenter.shift_manager.config.ImageController.IMAGE_DIRECTORY;

@Service
public class ColaboradorService {
    private final ColaboradorRepository colaboradorRepository;
    private final EmpresaRepository empresaRepository;
    // Ruta de almacenamiento de la imagen
    private static final String IMAGE_URL_BASE = "http://localhost:8080/images/";

    public ColaboradorService(ColaboradorRepository colaboradorRepository, EmpresaRepository empresaRepository) {
        this.colaboradorRepository = colaboradorRepository;
        this.empresaRepository = empresaRepository;
    }

    // Guardar un nuevo colaborador
    public Colaborador saveColaborador(ColaboradorDTO colaboradorDTO, MultipartFile file) throws IOException {
        Empresa empresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        Colaborador colaborador = new Colaborador();
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setApellido(colaboradorDTO.getApellido());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setTelefono(colaboradorDTO.getTelefono());
        colaborador.setEmail(colaboradorDTO.getEmail());

        if (file != null && !file.isEmpty()) {
            if (file.getSize() > 1048576) { // Limitar tamaño a 1 MB
                throw new RuntimeException("La foto debe ser menor a 1 MB");
            }

            // Reformatear el nombre del archivo
            String fileName = generateNewFileName(colaboradorDTO.getNombre(), colaborador.getId(), file.getOriginalFilename());
            Path targetLocation = Paths.get(IMAGE_DIRECTORY + fileName);
            Files.copy(file.getInputStream(), targetLocation);

            // Generar la URL de la foto accesible desde el frontend
            String imageUrl = IMAGE_URL_BASE + fileName;

            // Asignar la URL de la foto al colaborador
            colaborador.setFotoUrl(imageUrl);
        }

        colaborador.setEmpresa(empresa);

        return colaboradorRepository.save(colaborador);
    }

    private String generateNewFileName(String nombreColaborador, Long colaboradorId, String originalFileName) {
        // Obtener la extensión del archivo
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));

        // Generar un nuevo nombre usando el formato deseado
        String newFileName = nombreColaborador + colaboradorId + "SCprofilePhoto" + extension;

        return newFileName;
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
        // Buscar el colaborador por ID
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        // Buscar la nueva empresa por ID
        Empresa nuevaEmpresa = empresaRepository.findById(colaboradorDTO.getEmpresaId())
                .orElseThrow(() -> new RuntimeException("Empresa con ID " + colaboradorDTO.getEmpresaId() + " no encontrada"));

        // Actualizar datos del colaborador
        colaborador.setNombre(colaboradorDTO.getNombre());
        colaborador.setApellido(colaboradorDTO.getApellido());
        colaborador.setDni(colaboradorDTO.getDni());
        colaborador.setTelefono(colaboradorDTO.getTelefono());
        colaborador.setEmail(colaboradorDTO.getEmail());
        colaborador.setEmpresa(nuevaEmpresa);

        // Manejar la actualización de la imagen
        if (file != null && !file.isEmpty()) {
            if (file.getSize() > 1048576) { // Limitar tamaño a 1 MB
                throw new RuntimeException("La foto debe ser menor a 1 MB");
            }

            // Generar un nuevo nombre de archivo
            String fileName = generateNewFileName(colaboradorDTO.getNombre(), colaborador.getId(), file.getOriginalFilename());
            Path targetLocation = Paths.get(IMAGE_DIRECTORY + fileName);

            // Verificar si ya existe un archivo con el mismo nombre y eliminarlo
            if (Files.exists(targetLocation)) {
                Files.delete(targetLocation);
            }

            // Guardar el nuevo archivo
            Files.copy(file.getInputStream(), targetLocation);

            // Generar y asignar la nueva URL de la foto
            String imageUrl = IMAGE_URL_BASE + fileName;
            colaborador.setFotoUrl(imageUrl);
        }

        // Guardar el colaborador actualizado en la base de datos
        return colaboradorRepository.save(colaborador);
    }



    // Eliminar un colaborador
    public void deleteColaborador(Long id) {
        Colaborador colaborador = colaboradorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Colaborador con ID " + id + " no encontrado"));

        // Al eliminar al colaborador, los turnos anteriores no se verán afectados
        colaboradorRepository.delete(colaborador);
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
                colaborador.getFotoUrl()      // Nuevo campo
        );
    }


}
