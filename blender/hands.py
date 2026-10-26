import math
import sys
from array import array
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

FINGER_SPANS = (0.42, 0.30, 0.28)

# Short overlapping strokes, not meridians. Counts are per hand.
# Detail sits in the fingers and the palm; the wrist is only a cuff.
FINGER_STROKES = {"index": 150, "middle": 120, "ring": 100, "pinky": 72}
THUMB_STROKES = 96
PALM_STROKES = 280
WRIST_STROKES = 16
NAIL_STROKES = 16
WEB_STROKES = 4

# Shared reach axis. Tips sit just off the midpoint so the bundles nearly meet.
REACH = Vector((-0.68, 0.04, 0.72))
REACH_HALF = 0.0028

ADAM = {
    "mirror": False,
    "finger": REACH,
    "thumb": Vector((-0.12, 0.10, 0.92)),
    "palm": Vector((0.0, 1.0, 0.0)),
    "tip": -REACH.normalized() * REACH_HALF,
    "index": (3, 2, 0, 0),
    "middle": (8, 10, 4, 3),
    "ring": (12, 14, 6, 5),
    "pinky": (16, 18, 8, 7),
    "thumb_curl": (28, 18, 12),
    "thumb_dir": Vector((0.62, 0.28, 0.42)),
}

GOD = {
    "mirror": True,
    "finger": -REACH,
    "thumb": Vector((-0.88, -0.08, -0.22)),
    "palm": Vector((0.0, -1.0, 0.0)),
    "tip": REACH.normalized() * REACH_HALF,
    "index": (0, 0, 0, 0),
    "middle": (6, 14, 6, -3),
    "ring": (10, 22, 8, -6),
    "pinky": (14, 28, 10, -8),
    "thumb_curl": (26, 18, 10),
    "thumb_dir": Vector((0.66, -0.24, 0.32)),
}


class RNG:
    def __init__(self, seed):
        self.state = seed & 0xFFFFFFFF

    def random(self):
        self.state = (1664525 * self.state + 1013904223) & 0xFFFFFFFF
        return self.state / 4294967296

    def uniform(self, lo, hi):
        return lo + (hi - lo) * self.random()

    def chance(self, probability):
        return self.random() < probability


def script_dir():
    argv = sys.argv
    if "--python" in argv:
        return Path(argv[argv.index("--python") + 1]).resolve().parent
    return Path("/workspace/website/blender")


def v(*coords):
    return Vector(coords)


def normalized(vector):
    copy = vector.copy()
    if copy.length < 1e-8:
        return v(0, 0, 1)
    copy.normalize()
    return copy


def mix(a, b, t):
    return a + (b - a) * t


def wave(t, phase, freq):
    return math.sin(t * freq + phase) * 0.65 + math.sin(t * freq * 2.17 + phase * 1.7) * 0.35


def frame_from(tangent, palm):
    forward = normalized(tangent)
    up = palm - forward * palm.dot(forward)
    if up.length < 1e-6:
        up = v(0, 1, 0) - forward * forward.dot(v(0, 1, 0))
    up = normalized(up)
    side = normalized(up.cross(forward))
    up = normalized(forward.cross(side))
    return side, up, forward


def catmull(points, steps):
    if len(points) < 2:
        return list(points)
    padded = [points[0] * 2 - points[1], *points, points[-1] * 2 - points[-2]]
    sampled = []
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1 : index + 3]
        for step in range(steps):
            t = step / steps
            t2 = t * t
            t3 = t2 * t
            sampled.append(
                0.5
                * (
                    (2 * p1)
                    + (-p0 + p2) * t
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
                )
            )
    sampled.append(points[-1].copy())
    return sampled


def bone_chain(origin, direction, palm, lengths, curls, spread):
    forward = normalized(direction)
    palm = normalized(palm)
    if spread:
        forward = normalized(Matrix.Rotation(-spread, 4, palm) @ forward)
    points = [origin.copy()]
    palms = [palm.copy()]
    for length, curl in zip(lengths, curls):
        axis = forward.cross(palm)
        if axis.length < 1e-6:
            axis = v(1, 0, 0)
        axis.normalize()
        if abs(curl) > 1e-6:
            rotation = Matrix.Rotation(curl, 4, axis)
            forward = normalized(rotation @ forward)
            palm = normalized(rotation @ palm)
        points.append(points[-1] + forward * length)
        palms.append(palm.copy())
    return points, palms


def sample_chain(points, palms, steps):
    centers = catmull(points, steps)
    total = max(len(centers) - 1, 1)
    sampled_palms = []
    spans = len(points) - 1
    for index in range(len(centers)):
        u = index / total
        slot = min(spans - 1, int(u * spans))
        local = u * spans - slot
        sampled_palms.append(normalized(mix(palms[slot], palms[slot + 1], local)))
    return centers, sampled_palms


def sample_radii(radii, count):
    spans = len(radii) - 1
    sampled = []
    for index in range(count):
        u = index / max(count - 1, 1)
        slot = min(spans - 1, int(u * spans)) if spans else 0
        local = u * spans - slot if spans else 0
        nxt = min(slot + 1, len(radii) - 1)
        sampled.append(
            (
                mix(radii[slot][0], radii[nxt][0], local),
                mix(radii[slot][1], radii[nxt][1], local),
            )
        )
    return sampled


def finger_profile(count, base, tip, joints):
    radii = []
    bulges = [joint - 0.055 for joint in joints]
    for index in range(count):
        u = index / max(count - 1, 1)
        rx = mix(base[0], tip[0], u)
        ry = mix(base[1], tip[1], u)
        for joint in joints:
            pinch = math.exp(-((u - joint) ** 2) / 0.0009)
            amount = 0.20 if joint > 0.2 else 0.10
            rx *= 1 - amount * pinch
            ry *= 1 - amount * 0.82 * pinch
        for joint in bulges:
            bulge = math.exp(-((u - joint) ** 2) / 0.0015)
            rx *= 1 + 0.18 * bulge
            ry *= 1 + 0.12 * bulge
        if u > 0.84:
            nail = (u - 0.84) / 0.16
            rx *= 1 - 0.30 * nail
            ry *= 1 - 0.55 * nail
        radii.append((rx, ry))
    return radii


class Tube:
    def __init__(self, centers, sides, ups, forwards, radii):
        self.centers = centers
        self.sides = sides
        self.ups = ups
        self.forwards = forwards
        self.radii = radii
        self.count = len(centers)
        length = 0.0
        for index in range(self.count - 1):
            length += (centers[index + 1] - centers[index]).length
        self.length = max(length, 1e-4)

    def sample(self, u):
        clamped = min(max(u, 0.0), 1.0)
        x = clamped * (self.count - 1)
        index = min(int(x), self.count - 2)
        local = x - index
        center = mix(self.centers[index], self.centers[index + 1], local)
        forward = normalized(mix(self.forwards[index], self.forwards[index + 1], local))
        side = mix(self.sides[index], self.sides[index + 1], local)
        side = side - forward * side.dot(forward)
        if side.length < 1e-8:
            side = self.sides[index].copy()
        side = normalized(side)
        up = normalized(forward.cross(side))
        rx = mix(self.radii[index][0], self.radii[index + 1][0], local)
        ry = mix(self.radii[index][1], self.radii[index + 1][1], local)
        if u > 1.0:
            center = center + forward * ((u - 1.0) * self.length)
            taper = max(0.42, 1.0 - (u - 1.0) * 3.2)
            rx *= taper
            ry *= taper
        elif u < 0.0:
            center = center + forward * (u * self.length)
        return center, side, up, forward, rx, ry


def make_tube(centers, palms, radii):
    sides = []
    ups = []
    forwards = []
    side = None
    for index, center in enumerate(centers):
        if index == 0:
            tangent = centers[1] - centers[0]
        elif index == len(centers) - 1:
            tangent = centers[-1] - centers[-2]
        else:
            tangent = centers[index + 1] - centers[index - 1]
        tangent = normalized(tangent)
        palm = palms[index]
        if side is None:
            side, up, forward = frame_from(tangent, palm)
        else:
            forward = tangent
            projected = side - forward * side.dot(forward)
            if projected.length < 1e-6 or projected.normalized().dot(side) < 0.2:
                side, up, forward = frame_from(tangent, palm)
            else:
                side = normalized(projected)
                up = normalized(forward.cross(side))
                if up.dot(palm) < 0:
                    up.negate()
                    side.negate()
        sides.append(side.copy())
        ups.append(up.copy())
        forwards.append(forward.copy())
    return Tube(centers, sides, ups, forwards, radii)


def joint_parameters(lengths):
    total = sum(lengths) or 1.0
    cursor = 0.0
    joints = []
    for length in lengths[:-1]:
        cursor += length
        joints.append(cursor / total)
    return joints


def chain_tube(origin, direction, palm, lengths, curls, spread, base, tip, steps):
    points, palms = bone_chain(origin, direction, palm, lengths, curls, spread)
    centers, sampled = sample_chain(points, palms, steps)
    joints = joint_parameters(lengths)
    profile = finger_profile(len(centers), base, tip, joints)
    return make_tube(centers, sampled, profile), points[-1], points[0], joints


class Fibers:
    def __init__(self):
        self.lines = []

    def add(self, points):
        cleaned = [points[0]]
        for point in points[1:]:
            if (point - cleaned[-1]).length > 1e-5:
                cleaned.append(point)
        if len(cleaned) >= 2:
            self.lines.append(cleaned)

    def counts(self):
        verts = sum(len(line) for line in self.lines)
        edges = sum(len(line) - 1 for line in self.lines)
        return verts, len(self.lines), edges


def stroke_span(rng, long_bias=0.0):
    roll = rng.random()
    if roll < 0.46 - long_bias:
        return rng.uniform(0.22, 0.40)
    if roll < 0.82:
        return rng.uniform(0.40, 0.66)
    return rng.uniform(0.66, 0.92)


def stroke_drift(rng, wild=0.22):
    roll = rng.random()
    if roll < 1.0 - wild:
        return rng.uniform(-0.45, 0.45)
    if roll < 0.92:
        return rng.uniform(-1.4, 1.4)
    return rng.uniform(-2.6, 2.6)


def emit_stroke(fibers, tube, rng, u0, u1, theta, drift, radial, noise, peel, peel_u):
    span = abs(u1 - u0)
    count = max(8, int(round(abs(span) * 40)))
    phase = rng.random() * math.tau
    phase_b = rng.random() * math.tau
    freq = rng.uniform(2.4, 6.2)
    freq_b = rng.uniform(3.1, 7.4)
    amp_theta = noise * rng.uniform(0.7, 1.5)
    amp_rad = noise * rng.uniform(0.45, 1.0)
    points = []
    for index in range(count):
        t = index / (count - 1)
        u = mix(u0, u1, t)
        center, side, up, _forward, rx, ry = tube.sample(u)
        angle = theta + drift * t + wave(t, phase, freq) * amp_theta
        wobble = 1.0 + wave(t, phase_b, freq_b) * amp_rad
        radius_x = rx * radial * wobble
        radius_y = ry * radial * wobble
        if peel > 0.0:
            proximity = max(0.0, 1.0 - abs(u - peel_u) / 0.42)
            extra = peel * proximity * proximity
            radius_x += extra
            radius_y += extra
        points.append(center + side * math.cos(angle) * radius_x + up * math.sin(angle) * radius_y)
    fibers.add(points)


def bundle(
    fibers,
    tube,
    rng,
    count,
    noise,
    radial_lo,
    radial_hi,
    peel_chance,
    peel,
    peel_u,
    overshoot=0.0,
    long_bias=0.0,
    wild=0.2,
    tip_reach=0.0,
):
    last = None
    for _index in range(count):
        if last is not None and rng.chance(0.58):
            theta = last + rng.uniform(-0.22, 0.22)
        else:
            theta = rng.random() * math.tau
        last = theta
        span = stroke_span(rng, long_bias)
        if tip_reach and rng.chance(tip_reach):
            u1 = 1.0 + rng.uniform(0.015, max(overshoot, 0.02))
            u0 = max(0.08, u1 - max(span, 0.55))
        elif overshoot and rng.chance(0.18):
            u1 = 1.0 + rng.uniform(0.008, overshoot)
            u0 = max(0.0, u1 - span)
        else:
            u0 = rng.random() * max(1.0 - span, 0.001)
            u1 = u0 + span
        peel_amount = rng.uniform(peel[0], peel[1]) if rng.chance(peel_chance) else 0.0
        emit_stroke(
            fibers,
            tube,
            rng,
            u0,
            u1,
            theta,
            stroke_drift(rng, wild),
            rng.uniform(radial_lo, radial_hi),
            noise,
            peel_amount,
            peel_u,
        )


def stray_strands(fibers, tube, rng, count):
    for _index in range(count):
        theta = rng.random() * math.tau
        u0 = rng.uniform(0.18, 0.72)
        steps = 16 + int(rng.random() * 8)
        drift = rng.uniform(0.012, 0.028)
        bend = rng.uniform(-0.5, 0.5)
        past = rng.uniform(0.025, 0.06)
        points = []
        for step in range(steps):
            t = step / (steps - 1)
            u = u0 * (1.0 - t) - t * past
            center, side, up, forward, rx, ry = tube.sample(u)
            angle = theta + bend * t
            outward = normalized(side * math.cos(angle) + up * math.sin(angle))
            reach = mix(0.96, 1.05, t) 
            pos = center + outward * ((rx + ry) * 0.5 * reach + drift * t * t)
            pos += forward.cross(outward) * (drift * 0.45 * math.sin(t * math.pi))
            points.append(pos)
        fibers.add(points)


def webs(fibers, rng, bases, palm):
    palm = normalized(palm)
    for index in range(len(bases) - 1):
        start = bases[index]
        end = bases[index + 1]
        across = end - start
        if across.length < 1e-5:
            continue
        side = normalized(across)
        for _stroke in range(WEB_STROKES):
            shift = palm * rng.uniform(-0.003, 0.006) + side.cross(palm) * rng.uniform(-0.002, 0.002)
            a = start + shift + side * rng.uniform(-0.004, 0.008)
            b = end + shift + side * rng.uniform(-0.008, 0.004)
            bow = palm * rng.uniform(0.001, 0.007) + side.cross(palm) * rng.uniform(-0.003, 0.003)
            mid = (a + b) * 0.5 + bow
            steps = 7 + int(rng.random() * 4)
            points = []
            for step in range(steps):
                t = step / (steps - 1)
                points.append((1 - t) ** 2 * a + 2 * (1 - t) * t * mid + t ** 2 * b)
            fibers.add(points)


def stations_tube(stations, steps):
    centers = []
    palms = []
    radii = []
    for z, x, y, rx, ry in stations:
        centers.append(v(x, y, z))
        palms.append(v(0, 1, 0))
        radii.append((rx, ry))
    sampled = catmull(centers, steps)
    sampled_palms = [v(0, 1, 0) for _ in sampled]
    sampled_radii = sample_radii(radii, len(sampled))
    return make_tube(sampled, sampled_palms, sampled_radii)


def build_palm_tube():
    stations = [
        (-0.030, 0.006, 0.026, 0.034, 0.018),
        (0.012, 0.002, 0.010, 0.046, 0.016),
        (0.052, 0.000, 0.004, 0.058, 0.015),
        (0.096, -0.002, 0.003, 0.066, 0.014),
    ]
    return stations_tube(stations, 5)


def build_wrist_tube():
    stations = [
        (-0.058, 0.004, 0.030, 0.024, 0.016),
        (-0.042, 0.003, 0.028, 0.030, 0.017),
        (-0.028, 0.004, 0.026, 0.034, 0.018),
    ]
    return stations_tube(stations, 2)


def finger_specs(pose):
    return [
        ("index", 0.026, 0.112, 0.108, (0.0124, 0.0100), (0.0076, 0.0062), pose["index"]),
        ("middle", 0.000, 0.118, 0.114, (0.0128, 0.0104), (0.0074, 0.0060), pose["middle"]),
        ("ring", -0.026, 0.108, 0.100, (0.0118, 0.0096), (0.0068, 0.0056), pose["ring"]),
        ("pinky", -0.050, 0.096, 0.082, (0.0096, 0.0078), (0.0056, 0.0046), pose["pinky"]),
    ]


def knuckle_rings(fibers, tube, rng, joints):
    for joint in joints:
        arcs = 8 if joint > 0.25 else 6
        for _arc in range(arcs):
            theta = -math.pi / 2 + rng.uniform(-1.2, 1.2)
            span = rng.uniform(0.42, 0.95)
            direction = -1.0 if rng.chance(0.5) else 1.0
            radial = rng.uniform(0.98, 1.12)
            proud = rng.uniform(0.0012, 0.0042)
            jitter = rng.uniform(-0.014, 0.010)
            steps = 8
            points = []
            for step in range(steps):
                t = step / (steps - 1)
                angle = theta + direction * span * (t - 0.5)
                center, side, up, _forward, rx, ry = tube.sample(joint - 0.045 + jitter)
                points.append(
                    center
                    + side * math.cos(angle) * rx * radial
                    + up * math.sin(angle) * ry * radial
                    - up * proud
                )
            fibers.add(points)


def nail_plate(fibers, tube, rng, count):
    for _stroke in range(count):
        theta = -math.pi / 2 + rng.uniform(-0.48, 0.48)
        u0 = rng.uniform(0.82, 0.88)
        u1 = rng.uniform(1.0, 1.07)
        radial = rng.uniform(0.42, 0.88)
        steps = 8
        points = []
        for step in range(steps):
            t = step / (steps - 1)
            center, side, up, _forward, rx, ry = tube.sample(mix(u0, u1, t))
            points.append(
                center
                + side * math.cos(theta) * rx * radial
                + up * math.sin(theta) * ry * 0.28
                - up * ry * 0.72
            )
        fibers.add(points)
    for u_value, arcs, width in ((0.875, 4, 0.62), (1.0, 4, 0.48)):
        for _arc in range(arcs):
            theta = -math.pi / 2 + rng.uniform(-width, width)
            span = rng.uniform(0.28, 0.7)
            direction = -1.0 if rng.chance(0.5) else 1.0
            steps = 7
            points = []
            for step in range(steps):
                t = step / (steps - 1)
                angle = theta + direction * span * (t - 0.5)
                center, side, up, _forward, rx, ry = tube.sample(u_value + rng.uniform(-0.008, 0.008))
                points.append(
                    center
                    + side * math.cos(angle) * rx * rng.uniform(0.55, 0.92)
                    + up * math.sin(angle) * ry * 0.22
                    - up * ry * 0.78
                )
            fibers.add(points)


def palm_creases(fibers, tube, rng):
    bands = (
        (0.80, 16, 0.012),
        (0.64, 14, 0.008),
        (0.46, 10, -0.006),
    )
    for u_center, count, sag in bands:
        for _stroke in range(count):
            u = u_center + rng.uniform(-0.028, 0.028)
            x0 = rng.uniform(-0.84, -0.28)
            x1 = rng.uniform(0.22, 0.86)
            phase = rng.uniform(-0.15, 0.15)
            depth = rng.uniform(0.74, 1.0)
            steps = 12
            points = []
            for step in range(steps):
                t = step / (steps - 1)
                uu = min(max(u + math.sin((t + phase) * math.pi) * sag, 0.02), 0.98)
                center, side, up, _forward, rx, ry = tube.sample(uu)
                across = mix(x0, x1, t)
                bow = math.sin(t * math.pi) * rng.uniform(0.0, 0.006)
                points.append(center + side * across * rx + up * (ry * depth + bow))
            fibers.add(points)
    for _stroke in range(12):
        u0 = rng.uniform(0.14, 0.26)
        u1 = rng.uniform(0.60, 0.76)
        x0 = rng.uniform(0.38, 0.78)
        x1 = rng.uniform(-0.12, 0.22)
        depth = rng.uniform(0.76, 1.0)
        steps = 13
        points = []
        for step in range(steps):
            t = step / (steps - 1)
            center, side, up, _forward, rx, ry = tube.sample(mix(u0, u1, t))
            across = mix(x0, x1, t) + math.sin(t * math.pi) * rng.uniform(0.04, 0.12)
            points.append(center + side * across * rx + up * ry * depth)
        fibers.add(points)


def palm_scribbles(fibers, tube, rng, count):
    for _stroke in range(count):
        u0 = rng.uniform(0.1, 0.86)
        span = rng.uniform(0.07, 0.2)
        along = rng.chance(0.62)
        theta = rng.random() * math.tau
        radial = rng.uniform(0.7, 1.06)
        drift = rng.uniform(-1.1, 1.1)
        x0 = rng.uniform(-0.75, -0.15)
        x1 = rng.uniform(0.15, 0.8)
        depth = rng.uniform(0.55, 1.02)
        steps = 8
        points = []
        for step in range(steps):
            t = step / (steps - 1)
            if along:
                center, side, up, _forward, rx, ry = tube.sample(min(max(u0 + span * (t - 0.5), 0.0), 1.0))
                angle = theta + drift * t
                points.append(
                    center
                    + side * math.cos(angle) * rx * radial
                    + up * math.sin(angle) * ry * radial
                )
            else:
                center, side, up, _forward, rx, ry = tube.sample(min(max(u0 + span * 0.25 * math.sin(t * math.pi), 0.0), 1.0))
                points.append(center + side * mix(x0, x1, t) * rx + up * ry * depth)
        fibers.add(points)


def wrist_creases(fibers, tube, rng):
    for _stroke in range(10):
        u = rng.uniform(0.55, 0.92)
        x0 = rng.uniform(-0.7, -0.35)
        x1 = rng.uniform(0.35, 0.72)
        steps = 8
        points = []
        for step in range(steps):
            t = step / (steps - 1)
            center, side, up, _forward, rx, ry = tube.sample(u + rng.uniform(-0.02, 0.02))
            across = mix(x0, x1, t)
            points.append(center + side * across * rx * 0.92 + up * ry * rng.uniform(0.7, 0.98))
        fibers.add(points)


def constellation(fibers, rng):
    """Sparse straight links and nodes around the hand, not a fill."""
    nodes = []
    for _index in range(36):
        angle = rng.random() * math.tau
        radius = rng.uniform(0.1, 0.22)
        nodes.append(
            v(
                math.cos(angle) * radius,
                rng.uniform(-0.01, 0.15),
                rng.uniform(-0.03, 0.16) + math.sin(angle) * radius * 0.28,
            )
        )
    for index, node in enumerate(nodes):
        order = sorted(
            (other for other in range(len(nodes)) if other != index),
            key=lambda other: (nodes[other] - node).length,
        )
        for other in order[:2]:
            span = (nodes[other] - node).length
            if 0.025 < span < 0.13:
                fibers.add([node, nodes[other]])


def build_thumb_tube(pose):
    curls = [math.radians(value) for value in pose["thumb_curl"]]
    direction = normalized(pose["thumb_dir"])
    palm = normalized(v(-0.15, 0.55, 0.25))
    origin = v(0.018, 0.006, 0.018)
    lengths = (0.034, 0.028, 0.024)
    return chain_tube(
        origin,
        direction,
        palm,
        lengths,
        curls,
        0.0,
        (0.018, 0.014),
        (0.010, 0.0076),
        8,
    )


def build_hand(pose, seed):
    rng = RNG(seed)
    fibers = Fibers()
    palm = build_palm_tube()
    wrist = build_wrist_tube()
    bundle(
        fibers,
        palm,
        rng,
        PALM_STROKES,
        0.09,
        0.62,
        1.02,
        0.02,
        (0.003, 0.010),
        0.62,
        wild=0.36,
        long_bias=0.18,
    )
    palm_creases(fibers, palm, rng)
    palm_scribbles(fibers, palm, rng, 120)
    bundle(
        fibers,
        wrist,
        rng,
        WRIST_STROKES,
        0.10,
        0.80,
        1.02,
        0.0,
        (0.004, 0.010),
        0.4,
        wild=0.16,
        long_bias=0.4,
    )
    wrist_creases(fibers, wrist, rng)
    tips = {}
    bases = []
    local_palm = v(0, 1, 0)
    direction = v(0, 0, 1)
    for name, x, z, length, base, tip, angles in finger_specs(pose):
        mcp_curl, pip_curl, dip_curl, spread = [math.radians(value) for value in angles]
        origin = v(x, -0.002, z) - direction * 0.012
        lengths = [0.018, *[length * span for span in FINGER_SPANS]]
        tube, tip_point, base_point, joints = chain_tube(
            origin,
            direction,
            local_palm,
            lengths,
            [0.0, mcp_curl, pip_curl, dip_curl],
            spread,
            (base[0] * 1.02, base[1]),
            tip,
            8,
        )
        tips[name] = tip_point
        bases.append(base_point)
        bundle(
            fibers,
            tube,
            rng,
            FINGER_STROKES[name],
            0.16,
            0.78,
            1.08,
            0.1,
            (0.005, 0.014),
            joints[1] if len(joints) > 1 else 0.45,
            overshoot=0.06 if name == "index" else 0.016,
            long_bias=-0.18,
            wild=0.48,
            tip_reach=0.7 if name == "index" else 0.26,
        )
        knuckle_rings(fibers, tube, rng, joints)
        nail_plate(fibers, tube, rng, NAIL_STROKES if name != "pinky" else 24)
    thumb, thumb_tip, _thumb_base, thumb_joints = build_thumb_tube(pose)
    tips["thumb"] = thumb_tip
    bundle(
        fibers,
        thumb,
        rng,
        THUMB_STROKES,
        0.07,
        0.66,
        1.04,
        0.03,
        (0.004, 0.010),
        thumb_joints[0] if thumb_joints else 0.4,
        overshoot=0.02,
        wild=0.12,
        tip_reach=0.3,
    )
    knuckle_rings(fibers, thumb, rng, thumb_joints)
    nail_plate(fibers, thumb, rng, 28)
    webs(fibers, rng, bases, local_palm)
    constellation(fibers, rng)
    return fibers, tips


def orient(lines, tips, pose):
    if pose["mirror"]:
        lines = [[v(-point.x, point.y, point.z) for point in line] for line in lines]
        tips = {name: v(-point.x, point.y, point.z) for name, point in tips.items()}
    finger = normalized(pose["finger"])
    thumb = pose["thumb"].copy()
    if pose["mirror"]:
        thumb.negate()
    thumb = thumb - finger * thumb.dot(finger)
    thumb = normalized(thumb)
    palm = pose["palm"] - finger * pose["palm"].dot(finger)
    palm = palm - thumb * palm.dot(thumb)
    palm = normalized(palm)
    if palm.dot(pose["palm"]) < 0:
        palm.negate()
    rotation = Matrix((thumb, palm, finger)).transposed()
    shift = pose["tip"] - rotation @ tips["index"]
    world_lines = [[rotation @ point + shift for point in line] for line in lines]
    world_tips = {name: rotation @ point + shift for name, point in tips.items()}
    return world_lines, world_tips


def mesh_from_lines(lines):
    verts = sum(len(line) for line in lines)
    edges = sum(len(line) - 1 for line in lines)
    mesh = bpy.data.meshes.new("Hands")
    mesh.vertices.add(verts)
    mesh.edges.add(edges)
    coords = array("f", [0.0]) * (verts * 3)
    indices = array("i", [0]) * (edges * 2)
    vertex = 0
    edge = 0
    for line in lines:
        start = vertex
        for point in line:
            coords[vertex * 3] = point.x
            coords[vertex * 3 + 1] = point.y
            coords[vertex * 3 + 2] = point.z
            vertex += 1
        for index in range(len(line) - 1):
            indices[edge * 2] = start + index
            indices[edge * 2 + 1] = start + index + 1
            edge += 1
    mesh.vertices.foreach_set("co", coords)
    mesh.edges.foreach_set("vertices", indices)
    mesh.update(calc_edges=False, calc_edges_loose=True)
    mesh.validate(clean_customdata=False)
    return mesh


def assign_material(obj):
    material = bpy.data.materials.new("Hands")
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf and "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = (0.949, 0.949, 0.953, 1)
    obj.data.materials.append(material)


def export_paths():
    root = script_dir().parent
    blend = script_dir() / "hands.blend"
    glb = root / "public" / "models" / "hands.glb"
    glb.parent.mkdir(parents=True, exist_ok=True)
    return blend, glb


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export_glb(obj, path):
    addon = "io_scene_gltf2"
    if addon not in bpy.context.preferences.addons:
        bpy.ops.preferences.addon_enable(module=addon)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=False,
        export_materials="NONE",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        use_mesh_edges=True,
        use_mesh_vertices=False,
    )


def bounds_of(lines):
    xs, ys, zs = [], [], []
    for line in lines:
        for point in line:
            xs.append(point.x)
            ys.append(point.y)
            zs.append(point.z)
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def build():
    clear_scene()
    adam_fibers, adam_tips = build_hand(ADAM, 41011)
    god_fibers, god_tips = build_hand(GOD, 82037)
    adam_lines, adam_tips = orient(adam_fibers.lines, adam_tips, ADAM)
    god_lines, god_tips = orient(god_fibers.lines, god_tips, GOD)
    lines = adam_lines + god_lines
    mesh = mesh_from_lines(lines)
    loose = sum(1 for edge in mesh.edges if edge.is_loose)
    obj = bpy.data.objects.new("Hands", mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj)
    verts, strokes, edges = (len(mesh.vertices), len(lines), len(mesh.edges))
    gap = (adam_tips["index"] - god_tips["index"]).length
    min_x, max_x, min_y, max_y, min_z, max_z = bounds_of(lines)
    print(
        f"verts {verts} strokes {strokes} edges {edges} loose {loose}",
        flush=True,
    )
    print(
        f"bounds x {min_x:.3f}..{max_x:.3f} y {min_y:.3f}..{max_y:.3f} z {min_z:.3f}..{max_z:.3f}",
        flush=True,
    )
    for label, tips in (("adam", adam_tips), ("god", god_tips)):
        for name, point in tips.items():
            print(f"{label} {name} {tuple(round(c, 4) for c in point)}", flush=True)
    print(f"gap {gap:.4f} m", flush=True)
    blend, glb = export_paths()
    export_glb(obj, glb)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    print(f"wrote {glb} ({glb.stat().st_size} bytes)", flush=True)
    print(f"wrote {blend} ({blend.stat().st_size} bytes)", flush=True)


if __name__ == "__main__":
    build()
