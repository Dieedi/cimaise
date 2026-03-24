package com.moody.board;

import com.moody.frame.BoardFrame;
import com.moody.frame.BoardFrameRepository;
import com.moody.image.BoardImage;
import com.moody.image.BoardImageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Generates .moody files (ZIP archives) from board data stored in the database.
 *
 * The .moody format:
 *   monboard.moody (= ZIP)
 *   ├── board.json    — canvas state, image positions, frame definitions
 *   └── images/
 *       ├── img1.jpg  — embedded image files (read from network paths)
 *       └── ...
 *
 * Images are read from their file paths (network or local) and embedded
 * into the ZIP. If an image file is not accessible, it is skipped with a warning.
 */
@Service
public class ExportService {

    private final BoardService boardService;
    private final BoardImageRepository imageRepository;
    private final BoardFrameRepository frameRepository;
    private final ObjectMapper objectMapper;

    @Value("${moody.shared-path:/data/shared}")
    private String sharedPath;

    public ExportService(
            BoardService boardService,
            BoardImageRepository imageRepository,
            BoardFrameRepository frameRepository,
            ObjectMapper objectMapper
    ) {
        this.boardService = boardService;
        this.imageRepository = imageRepository;
        this.frameRepository = frameRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Generate a .moody ZIP archive for the given board.
     * Reads images from their file paths and embeds them in the archive.
     */
    public byte[] export(UUID boardId) throws IOException {
        Board board = boardService.findById(boardId);
        List<BoardImage> images = imageRepository.findByBoardId(boardId);
        List<BoardFrame> frames = frameRepository.findByBoardId(boardId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {

            // Embed image files and build image metadata
            List<Map<String, Object>> imageDataList = new ArrayList<>();
            for (BoardImage img : images) {
                String id = img.getId().toString();
                String extension = getExtension(img.getFilePath());
                String zipFilename = "images/" + id + "." + extension;

                // Try to read the image file and embed it
                byte[] fileBytes = readImageFile(img.getFilePath());
                if (fileBytes != null) {
                    zip.putNextEntry(new ZipEntry(zipFilename));
                    zip.write(fileBytes);
                    zip.closeEntry();
                }

                Map<String, Object> imgData = new LinkedHashMap<>();
                imgData.put("id", id);
                imgData.put("file", fileBytes != null ? zipFilename : null);
                imgData.put("type", fileBytes != null ? "embedded" : "path");
                imgData.put("filePath", img.getFilePath());
                imgData.put("x", img.getX());
                imgData.put("y", img.getY());
                imgData.put("width", img.getWidth());
                imgData.put("height", img.getHeight());
                imgData.put("scaleX", img.getScaleX());
                imgData.put("scaleY", img.getScaleY());
                imgData.put("rotation", img.getRotation());
                imageDataList.add(imgData);
            }

            // Build frame metadata
            List<Map<String, Object>> frameDataList = new ArrayList<>();
            for (BoardFrame frame : frames) {
                Map<String, Object> frameData = new LinkedHashMap<>();
                frameData.put("id", frame.getId().toString());
                frameData.put("title", frame.getTitle());
                frameData.put("x", frame.getX());
                frameData.put("y", frame.getY());
                frameData.put("width", frame.getWidth());
                frameData.put("height", frame.getHeight());
                frameData.put("bgColor", frame.getBgColor());
                frameData.put("children", frame.getChildren().stream()
                        .map(UUID::toString).toList());
                frameDataList.add(frameData);
            }

            // Build board.json
            Map<String, Object> boardData = new LinkedHashMap<>();
            boardData.put("version", "1.2");
            boardData.put("canvas", Map.of("x", 0, "y", 0, "scale", 1.0));
            boardData.put("images", imageDataList);
            boardData.put("frames", frameDataList);

            zip.putNextEntry(new ZipEntry("board.json"));
            zip.write(objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsBytes(boardData));
            zip.closeEntry();
        }

        return baos.toByteArray();
    }

    /** Try to read an image file from a local or network path */
    private byte[] readImageFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                return Files.readAllBytes(path);
            }
            // Try relative to the shared path
            Path sharedFile = Paths.get(sharedPath, filePath);
            if (Files.exists(sharedFile)) {
                return Files.readAllBytes(sharedFile);
            }
        } catch (Exception e) {
            System.err.println("[Export] Could not read image: " + filePath + " — " + e.getMessage());
        }
        return null;
    }

    /** Extract file extension from a path */
    private String getExtension(String filePath) {
        int dot = filePath.lastIndexOf('.');
        if (dot >= 0 && dot < filePath.length() - 1) {
            return filePath.substring(dot + 1).toLowerCase();
        }
        return "png";
    }
}
