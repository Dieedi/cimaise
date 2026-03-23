package com.moody.session;

import java.util.List;
import java.util.UUID;

/**
 * Response when opening a board.
 *
 * - token: the client's session token (use it for heartbeats and closing)
 * - otherClients: list of other people already working on this board
 *   If empty → you're alone. If not → the UI can warn and offer collaboration.
 */
public record OpenBoardResponse(
    UUID token,
    List<String> otherClients
) {}
