package com.moody.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request to open a board and get a session token.
 * clientName = display name shown to other users ("Jeremy's PC", "Script-01", etc.)
 */
public record OpenBoardRequest(
    @NotNull UUID boardId,
    @NotBlank String clientName
) {}
