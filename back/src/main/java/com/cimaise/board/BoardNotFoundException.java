package com.cimaise.board;

import java.util.UUID;

/** Thrown when a board ID does not exist in the database. */
public class BoardNotFoundException extends RuntimeException {
    public BoardNotFoundException(UUID id) {
        super("Board not found: " + id);
    }
}
