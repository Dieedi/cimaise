package com.cimaise.board;

/**
 * DTO for PUT /api/boards/{id} request body.
 * Both fields are optional — only non-null values are applied.
 */
public record UpdateBoardRequest(
    String title,
    String filePath
) {}
