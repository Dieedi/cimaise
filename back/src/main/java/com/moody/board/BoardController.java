package com.moody.board;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for board CRUD operations + export.
 *
 * Annotations:
 * - @RestController = @Controller + @ResponseBody
 *   Every method returns JSON directly (not an HTML view)
 * - @RequestMapping("/api/boards") = base path for all endpoints in this controller
 * - @Tag = Swagger grouping label
 *
 * HTTP methods map to CRUD:
 *   POST   = Create
 *   GET    = Read
 *   PUT    = Update
 *   DELETE = Delete
 */
@RestController
@RequestMapping("/api/boards")
@Tag(name = "Boards", description = "Board CRUD operations")
public class BoardController {

    private final BoardService service;
    private final ExportService exportService;

    public BoardController(BoardService service, ExportService exportService) {
        this.service = service;
        this.exportService = exportService;
    }

    @GetMapping
    @Operation(summary = "List all boards")
    public List<BoardDto> list() {
        return service.findAll().stream()
            .map(BoardDto::from)
            .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a board by ID")
    public BoardDto get(@PathVariable UUID id) {
        return BoardDto.from(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new board")
    public BoardDto create(@Valid @RequestBody CreateBoardRequest request) {
        return BoardDto.from(service.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a board")
    public BoardDto update(@PathVariable UUID id, @RequestBody UpdateBoardRequest request) {
        return BoardDto.from(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a board")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}/export")
    @Operation(summary = "Export a board as a .moody file (ZIP archive)")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) throws IOException {
        Board board = service.findById(id);
        byte[] zipData = exportService.export(id);

        String filename = board.getTitle().replaceAll("[^a-zA-Z0-9_\\-]", "_") + ".moody";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(zipData);
    }
}
