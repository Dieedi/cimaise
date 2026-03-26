package com.cimaise.board;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for POST /api/boards request body.
 *
 * @NotBlank = must not be null, empty, or whitespace.
 * Spring validates automatically when used with @Valid in the controller.
 */
public record CreateBoardRequest(
    @NotBlank String title,
    @NotBlank String filePath
) {}
