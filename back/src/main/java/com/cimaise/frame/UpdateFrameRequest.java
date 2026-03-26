package com.cimaise.frame;

import java.util.List;
import java.util.UUID;

public record UpdateFrameRequest(
    String title,
    Double x,
    Double y,
    Double width,
    Double height,
    String bgColor,
    List<UUID> children
) {}
