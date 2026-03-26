package com.cimaise.image;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for images within a board.
 * Nested under /api/boards/{boardId}/images for clarity.
 *
 * These endpoints are designed for Python scripting:
 *   requests.post(f"{API}/boards/{id}/images", json={...})
 */
@RestController
@RequestMapping("/api/boards/{boardId}/images")
@Tag(name = "Board Images", description = "Manage images within a board (scriptable API)")
public class BoardImageController {

    private final BoardImageService service;

    public BoardImageController(BoardImageService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all images in a board")
    public List<BoardImageDto> list(@PathVariable UUID boardId) {
        return service.findByBoard(boardId).stream()
            .map(BoardImageDto::from)
            .toList();
    }

    @GetMapping("/{imageId}")
    @Operation(summary = "Get an image by ID")
    public BoardImageDto get(@PathVariable UUID boardId, @PathVariable UUID imageId) {
        return BoardImageDto.from(service.findById(imageId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an image to a board",
        description = "filePath = network path to the image (e.g. /mnt/studio/renders/shot01.png)")
    public BoardImageDto create(@PathVariable UUID boardId, @Valid @RequestBody CreateImageRequest request) {
        return BoardImageDto.from(service.create(boardId, request));
    }

    @PutMapping("/{imageId}")
    @Operation(summary = "Update an image (position, scale, rotation...)")
    public BoardImageDto update(@PathVariable UUID boardId, @PathVariable UUID imageId,
                                @RequestBody UpdateImageRequest request) {
        return BoardImageDto.from(service.update(imageId, request));
    }

    @DeleteMapping("/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove an image from a board")
    public void delete(@PathVariable UUID boardId, @PathVariable UUID imageId) {
        service.delete(imageId);
    }
}
