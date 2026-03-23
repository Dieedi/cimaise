package com.moody.frame;

import java.util.List;
import java.util.UUID;

public record UpdateFrameRequest(
    String title,
    Double x,
    Double y,
    Double width,
    Double height,
    List<UUID> children
) {}
