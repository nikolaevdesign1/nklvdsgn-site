import math
import os

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "models", "about-field.glb"))

X0, X1 = -11.0, 11.0
Y0, Y1 = -5.2, 7.4
NX, NY = 140, 92
SHELL = 0.5

UPPER_ARM = 0.30
FOREARM = 0.26
HAND_LEN = 0.15
HAND_GAP = 0.045

BODY_VOXEL = 0.011
HAND_VOXEL = 0.0052

LEFT_SCALE = 0.9
RIGHT_SCALE = 1.1

LEFT_XY = Vector((-0.58, 1.28))
RIGHT_XY = Vector((0.62, 0.58))


def smooth(edge0, edge1, value):
    span = edge1 - edge0
    if abs(span) < 1e-8:
        return 0.0
    t = min(1.0, max(0.0, (value - edge0) / span))
    return t * t * (3.0 - 2.0 * t)


def base_height(x, y):
    h = 0.0
    h += 0.36 * math.sin(x * 0.27 + 0.35) * math.cos(y * 0.15 + 0.2)
    h += 0.28 * math.sin(y * 0.52 + 0.4)
    h += 0.16 * math.sin(x * 0.78 + y * 0.2 + 1.1)
    h += 0.1 * math.sin(x * 1.28 + 0.6) * math.sin(y * 0.46 + 0.3)
    ridge = math.exp(-((y - 1.02) ** 2) / 1.55)
    h += 0.92 * ridge * (0.84 + 0.16 * math.cos(x * 0.21))
    h += 0.58 * math.exp(-((y + 0.25) ** 2) / 2.05) * (0.62 + 0.38 * math.sin(x * 0.36 + 0.5))
    h += 0.42 * math.exp(-((y + 2.55) ** 2) / 1.85) * (0.7 + 0.3 * math.sin(x * 0.29 + 0.8))
    h += 0.2 * math.exp(-((y + 4.15) ** 2) / 1.15) * math.cos(x * 0.44 + 0.2)
    h += 0.7 * math.exp(-((y - 4.7) ** 2) / 4.4) * (0.58 + 0.42 * math.cos(x * 0.17 + 0.4))
    return h


def height(x, y):
    h = base_height(x, y)
    for spot in (LEFT_XY, RIGHT_XY):
        distance = math.hypot(x - spot.x, y - spot.y)
        radius = 0.55
        if distance >= radius:
            continue
        weight = 1.0 - smooth(0.0, radius, distance)
        h = h * (1.0 - weight) + base_height(spot.x, spot.y) * weight
    edge = smooth(8.6, 11.2, abs(x))
    edge = max(edge, smooth(5.6, 7.6, abs(y - 0.9)))
    return h * (1.0 - 0.72 * edge)


def new_object(name, bm, matrix):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate(clean_customdata=False)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world = matrix
    return obj


def parallel_frames(points):
    tangents = []
    last = len(points) - 1
    for index in range(len(points)):
        if index == 0:
            tangent = points[1] - points[0]
        elif index == last:
            tangent = points[last] - points[last - 1]
        else:
            tangent = points[index + 1] - points[index - 1]
        tangents.append(tangent.normalized())
    reference = Vector((0.0, 0.0, 1.0))
    if abs(tangents[0].dot(reference)) > 0.85:
        reference = Vector((0.0, 1.0, 0.0))
    normal = (reference - tangents[0] * reference.dot(tangents[0])).normalized()
    frames = []
    for index, tangent in enumerate(tangents):
        if index:
            previous = tangents[index - 1]
            axis = previous.cross(tangent)
            if axis.length > 1e-6:
                normal.rotate(Quaternion(axis.normalized(), previous.angle(tangent)))
            normal = (normal - tangent * normal.dot(tangent)).normalized()
        binormal = tangent.cross(normal).normalized()
        normal = binormal.cross(tangent).normalized()
        frames.append((binormal, normal))
    return frames


def add_loft(bm, points, radii, segments, caps=True):
    frames = parallel_frames(points)
    rings = []
    for point, radius, frame in zip(points, radii, frames):
        binormal, normal = frame
        rx, ry = radius if isinstance(radius, tuple) else (radius, radius)
        ring = []
        for step in range(segments):
            angle = math.tau * step / segments
            ring.append(bm.verts.new(point + binormal * (math.cos(angle) * rx) + normal * (math.sin(angle) * ry)))
        rings.append(ring)
    for index in range(len(rings) - 1):
        ring_a = rings[index]
        ring_b = rings[index + 1]
        for step in range(segments):
            nxt = (step + 1) % segments
            bm.faces.new((ring_a[step], ring_a[nxt], ring_b[nxt], ring_b[step]))
    if not caps:
        return
    for ring, point, sign in ((rings[0], points[0], True), (rings[-1], points[-1], False)):
        center = bm.verts.new(point)
        for step in range(segments):
            nxt = (step + 1) % segments
            if sign:
                bm.faces.new((center, ring[nxt], ring[step]))
            else:
                bm.faces.new((center, ring[step], ring[nxt]))


def add_sphere(bm, center, scale, segments=16, rings=12):
    matrix = Matrix.LocRotScale(Vector(center), Quaternion((1.0, 0.0, 0.0, 0.0)), Vector(scale))
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=1.0, matrix=matrix)


def finish(bm):
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def capsule(bm, start, end, r0, r1, segments=12, bulge=0.0, bulge_at=0.45):
    if (end - start).length < 1e-4:
        return
    steps = 6
    points = []
    radii = []
    for step in range(steps + 1):
        t = step / steps
        points.append(start.lerp(end, t))
        radius = r0 * (1.0 - t) + r1 * t
        radius += bulge * math.exp(-((t - bulge_at) ** 2) / 0.016)
        radii.append(radius)
    add_loft(bm, points, radii, segments)


def placed_ellipsoid(bm, origin, x_axis, y_axis, z_axis, radii, segments=14, rings=10):
    rotation = Matrix((
        (x_axis.x, y_axis.x, z_axis.x),
        (x_axis.y, y_axis.y, z_axis.y),
        (x_axis.z, y_axis.z, z_axis.z),
    )).to_4x4()
    matrix = Matrix.Translation(origin) @ rotation @ Matrix.Diagonal(Vector((radii[0], radii[1], radii[2], 1.0)))
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=1.0, matrix=matrix)


def hand_axes(along, palm_hint):
    forward = along.normalized()
    normal = palm_hint - forward * palm_hint.dot(forward)
    if normal.length < 1e-5:
        normal = Vector((0.0, 0.0, 1.0)) - forward * forward.z
    if normal.length < 1e-5:
        normal = Vector((0.0, 1.0, 0.0))
    normal.normalize()
    side = normal.cross(forward).normalized()
    return side, normal, forward


def add_hand(bm, wrist, along, palm_hint, scale=1.0, curl=0.12, spread=1.0):
    side, normal, forward = hand_axes(along, palm_hint)
    if side.z < 0.0:
        side = -side
        normal = -normal
    unit = scale
    palm_center = wrist + forward * (0.058 * unit)
    placed_ellipsoid(
        bm,
        palm_center,
        side,
        normal,
        forward,
        (0.038 * unit, 0.012 * unit, 0.050 * unit),
        16,
        12,
    )
    knuckle = wrist + forward * (0.096 * unit)
    spreads = (-0.028, -0.009, 0.009, 0.028)
    lengths = (0.058, 0.066, 0.060, 0.050)
    thick = (0.0088, 0.0092, 0.0086, 0.0074)
    for offset, length, radius in zip(spreads, lengths, thick):
        base = knuckle + side * (offset * spread * unit)
        lengthened = length * unit
        tip = base + forward * lengthened + side * (offset * 0.62 * spread * unit) - normal * (curl * lengthened)
        mid = base.lerp(tip, 0.46) - normal * (curl * lengthened * 0.18)
        capsule(bm, base, mid, radius * unit, radius * unit * 0.86, 8)
        capsule(bm, mid, tip, radius * unit * 0.86, radius * unit * 0.55, 8)
    thumb_base = wrist + forward * (0.046 * unit) + side * (-0.006 * unit) + normal * (0.008 * unit)
    thumb_mid = thumb_base + side * (0.028 * unit) + forward * (0.014 * unit) + normal * (0.016 * unit)
    thumb_tip = thumb_mid + side * (0.024 * unit) + forward * (0.018 * unit) + normal * (0.004 * unit)
    capsule(bm, thumb_base, thumb_mid, 0.011 * unit, 0.0095 * unit, 8)
    capsule(bm, thumb_mid, thumb_tip, 0.0095 * unit, 0.007 * unit, 8)


def fuse_bmesh(bm, voxel, smooth_iters, name):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    remesh = obj.modifiers.new("remesh", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = voxel
    remesh.adaptivity = 0.0
    remesh.use_smooth_shade = True
    if smooth_iters:
        smooth_mod = obj.modifiers.new("smooth", "SMOOTH")
        smooth_mod.iterations = smooth_iters
        smooth_mod.factor = 0.45
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    baked = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph), depsgraph=depsgraph)
    fused = bmesh.new()
    fused.from_mesh(baked)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    bpy.data.meshes.remove(baked)
    loose = [vert for vert in fused.verts if not vert.link_faces]
    if loose:
        bmesh.ops.delete(fused, geom=loose, context="VERTS")
    if not fused.faces:
        raise RuntimeError(f"{name} remesh produced an empty mesh")
    return finish(fused)


def ingest(bm, extra):
    extra.verts.ensure_lookup_table()
    copies = [bm.verts.new(vert.co) for vert in extra.verts]
    bm.verts.ensure_lookup_table()
    for face in extra.faces:
        try:
            bm.faces.new([copies[vert.index] for vert in face.verts])
        except ValueError:
            continue
    extra.free()
    return bm


def lerp_keys(z, keys):
    if z <= keys[0][0]:
        return keys[0][1:]
    if z >= keys[-1][0]:
        return keys[-1][1:]
    for index in range(len(keys) - 1):
        z0, *v0 = keys[index]
        z1, *v1 = keys[index + 1]
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            t = t * t * (3.0 - 2.0 * t)
            return tuple(a * (1.0 - t) + b * t for a, b in zip(v0, v1))
    return keys[-1][1:]


def add_torso(bm, shift, support_sign):
    keys = [
        (0.73, 0.055, 0.050, 0.045, -0.01, shift * 0.2),
        (0.82, 0.146, 0.108, 0.085, -0.016, shift),
        (0.92, 0.128, 0.102, 0.080, -0.004, shift * 0.7),
        (1.02, 0.102, 0.088, 0.078, 0.012, shift * 0.25),
        (1.12, 0.122, 0.100, 0.086, 0.026, -shift * 0.05),
        (1.22, 0.152, 0.118, 0.100, 0.040, -shift * 0.2),
        (1.32, 0.158, 0.112, 0.090, 0.026, -shift * 0.35),
        (1.40, 0.100, 0.078, 0.070, 0.016, -shift * 0.2),
        (1.48, 0.050, 0.046, 0.055, 0.014, 0.0),
        (1.55, 0.040, 0.038, 0.040, 0.016, 0.0),
    ]
    z = keys[0][0]
    while z <= keys[-1][0] + 1e-6:
        rx, ry, rz, y, x = lerp_keys(z, keys)
        add_sphere(bm, (x, y, z), (rx, ry, rz), 14, 10)
        z += 0.04
    add_sphere(bm, (shift * 0.25, -0.040, 0.86), (0.086, 0.038, 0.056), 12, 8)
    add_sphere(bm, (0.0, 0.006, 1.688), (0.072, 0.084, 0.090), 18, 14)
    add_sphere(bm, (0.0, 0.058, 1.562), (0.056, 0.064, 0.052), 14, 12)
    add_sphere(bm, (0.0, 0.116, 1.642), (0.012, 0.022, 0.016), 10, 8)
    for side in (-1.0, 1.0):
        add_sphere(bm, (side * 0.068, -0.014, 1.635), (0.009, 0.012, 0.024), 8, 6)
        drop = 0.0 if side == support_sign else 0.026
        neck = Vector((side * 0.02, 0.012, 1.50))
        outer = Vector((side * 0.198, 0.016, 1.352 - drop))
        capsule(bm, neck, outer, 0.046, 0.052, 10)
        add_sphere(bm, outer, (0.046, 0.040, 0.044), 10, 8)


def add_leg(bm, side, support_sign, shift):
    support = side == support_sign
    hip = Vector((side * 0.082 + shift * 0.45, -0.008, 0.90))
    if support:
        knee = Vector((side * 0.090 + shift * 0.2, 0.018, 0.50))
        ankle = Vector((side * 0.086 + shift * 0.1, 0.006, 0.088))
    else:
        knee = Vector((side * 0.112 + shift * 0.1, 0.085, 0.485))
        ankle = Vector((side * 0.108 + shift * 0.05, 0.070, 0.090))
    capsule(bm, hip, knee, 0.090, 0.060, 12, bulge=0.010, bulge_at=0.38)
    add_sphere(bm, knee + Vector((0.0, 0.020, 0.006)), (0.036, 0.028, 0.038), 10, 8)
    calf = knee.lerp(ankle, 0.42) + Vector((side * 0.004, -0.016, 0.0))
    capsule(bm, knee + Vector((0.0, -0.008, 0.02)), calf, 0.054, 0.062, 12)
    capsule(bm, calf, ankle, 0.062, 0.036, 12)
    add_sphere(bm, ankle, (0.034, 0.032, 0.032), 10, 8)
    return ankle


def add_hanging_arm(bm, reach_sign, support_sign):
    hang = -reach_sign
    drop = 0.0 if hang == support_sign else 0.03
    shoulder = Vector((hang * 0.175, 0.020, 1.36 - drop))
    elbow = Vector((hang * 0.305, 0.055, 1.02 - drop * 0.4))
    wrist = Vector((hang * 0.230, 0.075, 0.76))
    capsule(bm, shoulder, elbow, 0.054, 0.042, 12, bulge=0.010, bulge_at=0.4)
    add_sphere(bm, elbow, (0.038, 0.034, 0.036), 10, 8)
    capsule(bm, elbow, wrist, 0.040, 0.030, 12, bulge=0.006, bulge_at=0.34)
    add_sphere(bm, wrist, (0.032, 0.028, 0.030), 10, 8)
    return wrist, (wrist - elbow)


def add_detailed_foot(bm, ankle, side):
    heel = ankle + Vector((side * 0.003, -0.036, -0.048))
    arch = ankle + Vector((side * 0.004, 0.030, -0.056))
    ball = ankle + Vector((side * 0.004, 0.078, -0.050))
    toe = ankle + Vector((side * 0.003, 0.112, -0.038))
    capsule(bm, ankle, heel, 0.030, 0.032, 8)
    add_sphere(bm, heel, (0.030, 0.032, 0.028), 8, 6)
    add_sphere(bm, arch, (0.032, 0.042, 0.016), 8, 6)
    add_sphere(bm, ball, (0.034, 0.028, 0.018), 8, 6)
    add_sphere(bm, toe, (0.024, 0.022, 0.014), 8, 6)


def build_body(reach_sign, support_sign):
    bm = bmesh.new()
    shift = support_sign * 0.02
    add_torso(bm, shift, support_sign)
    ankles = [(side, add_leg(bm, side, support_sign, shift)) for side in (-1.0, 1.0)]
    wrist, direction = add_hanging_arm(bm, reach_sign, support_sign)
    fused = fuse_bmesh(bm, BODY_VOXEL, 3, "body_fuse")
    feet = bmesh.new()
    for side, ankle in ankles:
        add_detailed_foot(feet, ankle, side)
    ingest(fused, fuse_bmesh(feet, 0.006, 1, "feet_fuse"))
    lows = [vert.co.z for vert in fused.verts if vert.co.z < 0.35]
    drop = min(lows) if lows else 0.0
    for vert in fused.verts:
        vert.co.z -= drop
    wrist = Vector((wrist.x, wrist.y, wrist.z - drop))
    reach_drop = 0.0 if reach_sign == support_sign else 0.03
    shoulder = Vector((reach_sign * 0.178, 0.028, 1.36 - reach_drop - drop))
    return fused, shoulder, wrist, direction


def solve_elbow(shoulder, wrist, upper, fore, bend_hint):
    delta = wrist - shoulder
    span = upper + fore
    if delta.length > span * 0.965:
        wrist = shoulder + delta.normalized() * (span * 0.965)
        delta = wrist - shoulder
    if delta.length < span * 0.42:
        wrist = shoulder + delta.normalized() * (span * 0.42)
        delta = wrist - shoulder
    dist = max(delta.length, 1e-4)
    along = delta.normalized()
    cosine = (upper * upper + dist * dist - fore * fore) / (2.0 * upper * dist)
    cosine = max(-1.0, min(1.0, cosine))
    perp = bend_hint - along * bend_hint.dot(along)
    if perp.length < 1e-5:
        perp = Vector((0.0, -1.0, 0.0)) - along * Vector((0.0, -1.0, 0.0)).dot(along)
    perp.normalize()
    bend = upper * math.sqrt(max(0.0, 1.0 - cosine * cosine))
    elbow = shoulder + along * (cosine * upper) + perp * bend
    return elbow, wrist


def build_reaching_arm(shoulder, fingertip, scale):
    upper = UPPER_ARM * scale
    fore = FOREARM * scale
    hand_len = HAND_LEN * scale
    direction = fingertip - shoulder
    if direction.length < 1e-4:
        direction = Vector((0.0, -1.0, 0.0))
    wrist_guess = fingertip - direction.normalized() * hand_len
    bend_hint = Vector((0.0, -0.25, -1.0))
    elbow, wrist = solve_elbow(shoulder, wrist_guess, upper, fore, bend_hint)
    forearm = wrist - elbow
    if forearm.length > 1e-4:
        wrist = fingertip - forearm.normalized() * hand_len
        elbow, wrist = solve_elbow(shoulder, wrist, upper, fore, bend_hint)
    bm = bmesh.new()
    capsule(bm, shoulder, elbow, 0.060 * scale, 0.046 * scale, 12, bulge=0.016 * scale, bulge_at=0.4)
    outside = (elbow - shoulder).cross(wrist - elbow)
    if outside.length < 1e-5:
        outside = bend_hint
    elbow_point = elbow + outside.normalized() * (0.006 * scale) + bend_hint.normalized() * (0.006 * scale)
    add_sphere(bm, elbow_point, (0.040 * scale, 0.034 * scale, 0.036 * scale), 10, 8)
    capsule(bm, elbow, wrist, 0.046 * scale, 0.031 * scale, 12, bulge=0.010 * scale, bulge_at=0.34)
    add_sphere(bm, wrist, (0.033 * scale, 0.030 * scale, 0.032 * scale), 10, 8)
    fused = fuse_bmesh(bm, max(0.0075, HAND_VOXEL * 1.4), 2, "arm_fuse")
    hand = bmesh.new()
    forearm_dir = wrist - elbow
    if forearm_dir.length < 1e-4:
        forearm_dir = fingertip - wrist
    add_hand(hand, wrist, forearm_dir, Vector((0.0, -0.72, 0.62)), scale, curl=0.08, spread=1.12)
    hand = fuse_bmesh(hand, HAND_VOXEL, 1, "hand_fuse")
    ingest(fused, hand)
    for vert in fused.verts:
        vert.co -= shoulder
    return fused, wrist


def build_offhand(wrist, direction, reach_sign):
    bm = bmesh.new()
    hang = -reach_sign
    palm_hint = Vector((-hang * 0.35, 0.25, 0.15))
    add_hand(bm, wrist, direction + Vector((0.0, 0.02, -0.08)), palm_hint, 1.0, curl=0.42, spread=0.85)
    return fuse_bmesh(bm, HAND_VOXEL, 1, "offhand_fuse")


def figure_matrix(feet_xy, forward, scale, support_sign):
    location = Vector((feet_xy.x, feet_xy.y, height(feet_xy.x, feet_xy.y)))
    angle = math.atan2(-forward.x, forward.y)
    matrix = Matrix.Translation(location) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Scale(scale, 4)
    return plant(matrix, support_sign)


def parent_keep(child, parent):
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = world


def empty(name, matrix):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.2
    bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world = matrix
    return obj


def build_terrain():
    bm = bmesh.new()
    grid = []
    for row in range(NY + 1):
        y = Y0 + (Y1 - Y0) * row / NY
        line = []
        for col in range(NX + 1):
            x = X0 + (X1 - X0) * col / NX
            line.append(bm.verts.new((x, y, height(x, y))))
        grid.append(line)
    for row in range(NY):
        for col in range(NX):
            bm.faces.new((grid[row][col], grid[row][col + 1], grid[row + 1][col + 1], grid[row + 1][col]))
    extruded = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))["geom"]
    verts = [item for item in extruded if isinstance(item, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=verts, vec=Vector((0.0, 0.0, -SHELL)))
    return new_object("terrain", finish(bm), Matrix.Identity(4))


def plant(matrix, support_sign):
    shift = support_sign * 0.02
    free = -support_sign
    soles = (
        Vector((support_sign * 0.086 + shift * 0.1, 0.036, 0.0)),
        Vector((free * 0.108 + shift * 0.05, 0.100, 0.0)),
    )
    lift = min(height((matrix @ sole).x, (matrix @ sole).y) - (matrix @ sole).z for sole in soles)
    matrix.translation.z += lift
    return matrix


def build_figure(name, feet_xy, forward, reach_sign, support_sign, scale):
    matrix = figure_matrix(feet_xy, forward, scale, support_sign)
    root = empty(name, matrix)
    body_bm, shoulder_local, wrist_local, hang_dir = build_body(reach_sign, support_sign)
    body = new_object(f"{name}_body", body_bm, matrix.copy())
    bpy.context.view_layer.update()
    lowest = min((body.matrix_world @ vert.co for vert in body.data.vertices), key=lambda point: point.z)
    matrix.translation.z += height(lowest.x, lowest.y) - lowest.z
    body.matrix_world = matrix.copy()
    offhand = new_object(f"{name}_offhand", build_offhand(wrist_local, hang_dir, reach_sign), matrix.copy())
    bpy.context.view_layer.update()
    parent_keep(body, root)
    parent_keep(offhand, root)
    return root, matrix @ shoulder_local


def attach_arm(name, root, shoulder, fingertip, scale):
    arm_bm, wrist_world = build_reaching_arm(shoulder, fingertip, scale)
    arm = new_object(f"{name}_arm", arm_bm, Matrix.Translation(shoulder))
    bpy.context.view_layer.update()
    parent_keep(arm, root)
    reach = (wrist_world - shoulder).length
    span = (UPPER_ARM + FOREARM) * scale
    print(name, "extension", round(reach / span, 3), "wrist", tuple(round(v, 3) for v in wrist_world))
    return wrist_world


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="NONE",
        export_texcoords=False,
        export_normals=False,
        export_tangents=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_colors=False,
        use_selection=False,
    )


def polycount():
    verts = 0
    faces = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            verts += len(obj.data.vertices)
            faces += len(obj.data.polygons)
    return verts, faces


def preview():
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    camera_data = bpy.data.cameras.new("preview")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.angle = math.radians(27)
    camera_data.clip_start = 0.05
    camera_data.clip_end = 80
    camera = bpy.data.objects.new("preview_cam", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.95, 0.95, 0.953)
    scene.display.shading.show_backface_culling = False
    scene.display.shading.background_type = "VIEWPORT"
    world = bpy.data.worlds.new("flat")
    scene.world = world
    world.color = (0.02, 0.02, 0.024)
    if world.use_nodes and world.node_tree:
        background = world.node_tree.nodes.get("Background")
        if background:
            background.inputs[0].default_value = (0.02, 0.02, 0.024, 1)
    scene.render.film_transparent = False

    def snap(path, location, target, width, height):
        camera.location = location
        camera.rotation_euler = (target - location).to_track_quat("-Z", "Y").to_euler()
        scene.render.resolution_x = width
        scene.render.resolution_y = height
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)

    snap("/tmp/about-field-wide.png", Vector((0.15, -11.2, 2.7)), Vector((0.02, 0.5, 1.8)), 1440, 760)
    snap("/tmp/about-field-close.png", Vector((0.15, -2.15, 2.72)), Vector((-0.05, 0.82, 2.72)), 1400, 900)
    snap("/tmp/about-field-side.png", Vector((1.7, 0.72, 2.65)), Vector((0.15, 0.72, 2.55)), 1200, 900)
    terrain = bpy.data.objects.get("terrain")
    if terrain:
        terrain.hide_render = True
    snap("/tmp/about-field-figures.png", Vector((0.1, -2.5, 2.15)), Vector((0.05, 0.85, 2.15)), 1400, 1000)


def rotate_flat(forward, degrees):
    angle = math.radians(degrees)
    cosine, sine = math.cos(angle), math.sin(angle)
    return Vector((forward.x * cosine - forward.y * sine, forward.x * sine + forward.y * cosine))


def side_toward_camera(forward):
    plus_y = math.sin(math.atan2(-forward.x, forward.y))
    return 1.0 if plus_y < 0.0 else -1.0


def main():
    clear_scene()
    build_terrain()
    pair = (RIGHT_XY - LEFT_XY).normalized()
    nudge = pair * 0.055
    left_feet = LEFT_XY + nudge
    right_feet = RIGHT_XY - nudge
    left_forward = rotate_flat(pair, -12)
    right_forward = rotate_flat(-pair, -8)
    left_reach = side_toward_camera(left_forward)
    right_reach = side_toward_camera(right_forward)
    left_support, right_support = -left_reach, -right_reach
    print("reach", left_reach, right_reach, "support", left_support, right_support)
    left_root, left_shoulder = build_figure(
        "figure_left", left_feet, left_forward, left_reach, left_support, LEFT_SCALE
    )
    right_root, right_shoulder = build_figure(
        "figure_right", right_feet, right_forward, right_reach, right_support, RIGHT_SCALE
    )
    delta = right_shoulder - left_shoulder
    left_full = (UPPER_ARM + FOREARM + HAND_LEN) * LEFT_SCALE
    right_full = (UPPER_ARM + FOREARM + HAND_LEN) * RIGHT_SCALE
    print("shoulder dist", round(delta.length, 3), "reach", round(left_full, 3), round(right_full, 3))
    center = left_shoulder.lerp(right_shoulder, left_full / (left_full + right_full))
    direction = delta.normalized()
    left_tip = center - direction * (HAND_GAP * 0.5)
    right_tip = center + direction * (HAND_GAP * 0.5)
    left_wrist = attach_arm("figure_left", left_root, left_shoulder, left_tip, LEFT_SCALE)
    right_wrist = attach_arm("figure_right", right_root, right_shoulder, right_tip, RIGHT_SCALE)
    bpy.context.view_layer.update()
    print("wrist gap", round((left_wrist - right_wrist).length, 3))
    bpy.context.view_layer.update()
    for name in ("figure_left_body", "figure_right_body"):
        obj = bpy.data.objects[name]
        lowest = min((obj.matrix_world @ vert.co for vert in obj.data.vertices), key=lambda point: point.z)
        print(name, "sole", tuple(round(c, 3) for c in lowest), "terrain", round(height(lowest.x, lowest.y), 3))
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            print(obj.name, len(obj.data.vertices), "verts")
    verts, faces = polycount()
    print("mesh", verts, "verts", faces, "faces")
    export(OUT)
    size = os.path.getsize(OUT)
    print("exported", OUT, size, "bytes")
    if os.environ.get("ABOUT_FIELD_PREVIEW"):
        preview()


if __name__ == "__main__":
    main()
