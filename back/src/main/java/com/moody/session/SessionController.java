package com.moody.session;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@Tag(name = "Sessions", description = "Board session management (tokens, heartbeats)")
public class SessionController {

    private final SessionService service;

    public SessionController(SessionService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Open a board and get a session token",
        description = "Returns a token and the list of other clients already on this board")
    public OpenBoardResponse open(@Valid @RequestBody OpenBoardRequest request) {
        return service.openBoard(request);
    }

    @PutMapping("/{token}/heartbeat")
    @Operation(summary = "Send a heartbeat to keep the session alive")
    public void heartbeat(@PathVariable UUID token) {
        service.heartbeat(token);
    }

    @DeleteMapping("/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Close a session (disconnect from a board)")
    public void close(@PathVariable UUID token) {
        service.close(token);
    }

    @GetMapping("/board/{boardId}")
    @Operation(summary = "List active sessions on a board")
    public List<SessionDto> listByBoard(@PathVariable UUID boardId) {
        return service.getActiveSessions(boardId).stream()
            .map(SessionDto::from)
            .toList();
    }
}
