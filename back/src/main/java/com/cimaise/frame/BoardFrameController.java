package com.cimaise.frame;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards/{boardId}/frames")
@Tag(name = "Board Frames", description = "Manage frames within a board (scriptable API)")
public class BoardFrameController {

    private final BoardFrameService service;

    public BoardFrameController(BoardFrameService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all frames in a board")
    public List<BoardFrameDto> list(@PathVariable UUID boardId) {
        return service.findByBoard(boardId).stream()
            .map(BoardFrameDto::from)
            .toList();
    }

    @GetMapping("/{frameId}")
    @Operation(summary = "Get a frame by ID")
    public BoardFrameDto get(@PathVariable UUID boardId, @PathVariable UUID frameId) {
        return BoardFrameDto.from(service.findById(frameId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a frame in a board")
    public BoardFrameDto create(@PathVariable UUID boardId, @RequestBody CreateFrameRequest request) {
        return BoardFrameDto.from(service.create(boardId, request));
    }

    @PutMapping("/{frameId}")
    @Operation(summary = "Update a frame (position, size, title, children...)")
    public BoardFrameDto update(@PathVariable UUID boardId, @PathVariable UUID frameId,
                                @RequestBody UpdateFrameRequest request) {
        return BoardFrameDto.from(service.update(frameId, request));
    }

    @DeleteMapping("/{frameId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a frame from a board")
    public void delete(@PathVariable UUID boardId, @PathVariable UUID frameId) {
        service.delete(frameId);
    }
}
