package com.moody.frame;

import java.util.List;
import java.util.UUID;

public record CreateFrameRequest(
    String title,
    double x,
    double y,
    double width,
    double height,
    String bgColor,
    List<UUID> children
) {}
