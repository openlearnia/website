"""
Dress ward7 blockout into a readable hospital corridor.
Run inside Blender (MCP execute_blender_code or Scripting).
Keeps Col_*/Spawn_*/Interact_*/Checkpoint_* untouched.
"""
import bpy
from mathutils import Vector

DRESS_TAG = "DressHospital"


def ensure_mat(name, *, base, rough=0.7, metal=0.05, emit=(0, 0, 0), emit_str=0.0, alpha=1.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emit_str
    if alpha < 1.0:
        mat.blend_method = "BLEND"
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    return mat


def clear_prior_dress():
    for o in list(bpy.data.objects):
        if o.get(DRESS_TAG):
            bpy.data.objects.remove(o, do_unlink=True)


def box(name, loc, scale, mat, *, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if ob.data.materials:
        ob.data.materials[0] = mat
    else:
        ob.data.materials.append(mat)
    ob[DRESS_TAG] = True
    if collection:
        for c in list(ob.users_collection):
            c.objects.unlink(ob)
        collection.objects.link(ob)
    return ob


def upgrade_materials():
    # Ceiling must emit slightly — underside faces hemi ground (near-black in horror mode).
    ensure_mat(
        "Mat_Ceil",
        base=(0.78, 0.84, 0.8),
        rough=0.92,
        metal=0.0,
        emit=(0.75, 0.82, 0.78),
        emit_str=0.55,
    )
    ensure_mat(
        "Mat_CeilTile",
        base=(0.62, 0.66, 0.64),
        rough=0.88,
        metal=0.02,
        emit=(0.55, 0.6, 0.58),
        emit_str=0.25,
    )
    ensure_mat(
        "Mat_Floor",
        base=(0.38, 0.46, 0.42),
        rough=0.55,
        metal=0.04,
        emit=(0.08, 0.1, 0.09),
        emit_str=0.02,
    )
    ensure_mat(
        "Mat_Wall",
        base=(0.82, 0.88, 0.9),
        rough=0.78,
        metal=0.02,
        emit=(0.55, 0.6, 0.62),
        emit_str=0.045,
    )
    ensure_mat("Mat_Trim", base=(0.22, 0.28, 0.3), rough=0.5, metal=0.25)
    ensure_mat("Mat_Baseboard", base=(0.18, 0.24, 0.26), rough=0.45, metal=0.2)
    ensure_mat(
        "Mat_FixtureHouse",
        base=(0.2, 0.24, 0.26),
        rough=0.4,
        metal=0.55,
    )
    ensure_mat(
        "Mat_FixtureDiff",
        base=(0.75, 0.9, 0.82),
        rough=0.35,
        metal=0.0,
        emit=(0.35, 0.85, 0.55),
        emit_str=0.9,
    )
    ensure_mat(
        "Mat_GreenStrip",
        base=(0.18, 0.5, 0.32),
        rough=0.45,
        metal=0.08,
        emit=(0.2, 0.7, 0.4),
        emit_str=0.55,
    )
    ensure_mat(
        "Mat_Glass",
        base=(0.55, 0.72, 0.74),
        rough=0.22,
        metal=0.0,
        emit=(0.25, 0.35, 0.38),
        emit_str=0.08,
        alpha=0.55,
    )
    ensure_mat(
        "Mat_Panel",
        base=(0.7, 0.78, 0.8),
        rough=0.7,
        metal=0.03,
        emit=(0.4, 0.46, 0.48),
        emit_str=0.03,
    )
    ensure_mat("Mat_Door", base=(0.18, 0.24, 0.28), rough=0.48, metal=0.22)


def thicken_ceilings():
    mat = bpy.data.materials["Mat_Ceil"]
    for o in bpy.data.objects:
        if not o.name.startswith("Ceil_"):
            continue
        # Drop slightly + thicken so underside reads as a plane, not a paper edge.
        o.location.z = 3.0
        # Rebuild as thicker slab matching current footprint (dims already applied).
        sx, sy, _sz = o.dimensions
        for slot in o.material_slots:
            slot.material = mat
        # Ensure thickness via scale on Z if still paper-thin
        if o.dimensions.z < 0.08:
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            o.scale.z = max(0.12 / max(o.dimensions.z, 1e-4), 1.0)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            o.select_set(False)
            o.location.z = 3.0


def add_ceiling_tile_grid():
    """Shallow groove grid on corridor / lobby ceilings — hospital tile read."""
    mat = bpy.data.materials["Mat_CeilTile"]
    specs = [
        # name, center Blender (x,y,z), extent x, extent y, tile step
        ("Lobby", 0.0, -5.0, 6.0, 9.5, 1.2),
        ("Corridor", 0.0, -30.0, 2.9, 38.0, 1.2),
        ("Deep", 0.0, -76.0, 2.9, 50.0, 1.2),
        ("Nurses", -6.78, -12.0, 9.8, 7.4, 1.2),
        ("Utility", 5.78, -12.0, 7.8, 5.4, 1.2),
        ("Day", 6.78, -36.0, 9.8, 5.4, 1.2),
        ("Theater", 0.0, -89.0, 11.2, 9.2, 1.2),
    ]
    n = 0
    for label, cx, cy, ex, ey, step in specs:
        x0, x1 = cx - ex / 2, cx + ex / 2
        y0, y1 = cy - ey / 2, cy + ey / 2
        x = x0 + step
        while x < x1 - 0.05:
            box(
                f"Prop_CeilGrooveX_{label}_{n}",
                Vector((x, cy, 2.955)),
                Vector((0.03, ey * 0.98, 0.02)),
                mat,
            )
            n += 1
            x += step
        y = y0 + step
        while y < y1 - 0.05:
            box(
                f"Prop_CeilGrooveY_{label}_{n}",
                Vector((cx, y, 2.955)),
                Vector((ex * 0.98, 0.03, 0.02)),
                mat,
            )
            n += 1
            y += step


def replace_strips_with_fixtures():
    house = bpy.data.materials["Mat_FixtureHouse"]
    diff = bpy.data.materials["Mat_FixtureDiff"]
    strips = [o for o in bpy.data.objects if o.name.startswith("Prop_Strip_")]
    for i, s in enumerate(sorted(strips, key=lambda o: o.name)):
        loc = s.location.copy()
        # Recessed troffer: metal housing flush to ceiling, glowing diffuser below.
        box(
            f"Prop_Fixture_{i}_House",
            Vector((loc.x, loc.y, 2.98)),
            Vector((0.95, 0.42, 0.08)),
            house,
        )
        box(
            f"Prop_Fixture_{i}_Diff",
            Vector((loc.x, loc.y, 2.93)),
            Vector((0.82, 0.3, 0.04)),
            diff,
        )
        # Keep a thin emergency accent edge (clinical green), not floating in void.
        box(
            f"Prop_Fixture_{i}_Edge",
            Vector((loc.x, loc.y, 2.91)),
            Vector((0.88, 0.04, 0.02)),
            bpy.data.materials["Mat_GreenStrip"],
        )
        bpy.data.objects.remove(s, do_unlink=True)


def add_baseboards():
    mat = bpy.data.materials["Mat_Baseboard"]
    for wall in [o for o in bpy.data.objects if o.name.startswith("Wall_")]:
        dx, dy, dz = wall.dimensions
        # Skip tiny stubs
        if max(dx, dy) < 0.5:
            continue
        loc = wall.location.copy()
        loc.z = 0.07
        if dx <= dy:
            # Wall runs along Y (thin in X)
            sx, sy = max(dx + 0.06, 0.12), dy * 0.995
            # Offset slightly into room for visible ledge
            inward = 0.04 if abs(loc.x) > 0.01 else 0.0
            if loc.x > 0:
                loc.x -= inward
            elif loc.x < 0:
                loc.x += inward
        else:
            sx, sy = dx * 0.995, max(dy + 0.06, 0.12)
            if loc.y > 0:
                loc.y -= 0.04
            elif loc.y < 0:
                loc.y += 0.04
        box(f"Prop_Base_{wall.name}", loc, Vector((sx, sy, 0.14)), mat)


def add_door_frames():
    trim = bpy.data.materials["Mat_Trim"]
    for door in [o for o in bpy.data.objects if o.name.startswith("Door_")]:
        loc = door.location.copy()
        dx, dy, dz = door.dimensions
        # Vertical jambs + header
        thick = 0.1
        depth = max(dy, 0.14) + 0.06
        width = max(dx, 0.9)
        height = max(dz, 2.0)
        # Header
        box(
            f"Prop_Frame_{door.name}_H",
            Vector((loc.x, loc.y, loc.z + height / 2 + thick / 2)),
            Vector((width + thick * 2, depth, thick)),
            trim,
        )
        # Left / right jambs (along X for corridor doors)
        if dx >= dy:
            box(
                f"Prop_Frame_{door.name}_L",
                Vector((loc.x - width / 2 - thick / 2, loc.y, height / 2)),
                Vector((thick, depth, height)),
                trim,
            )
            box(
                f"Prop_Frame_{door.name}_R",
                Vector((loc.x + width / 2 + thick / 2, loc.y, height / 2)),
                Vector((thick, depth, height)),
                trim,
            )
        else:
            box(
                f"Prop_Frame_{door.name}_L",
                Vector((loc.x, loc.y - width / 2 - thick / 2, height / 2)),
                Vector((depth, thick, height)),
                trim,
            )
            box(
                f"Prop_Frame_{door.name}_R",
                Vector((loc.x, loc.y + width / 2 + thick / 2, height / 2)),
                Vector((depth, thick, height)),
                trim,
            )


def add_wall_panels_and_windows():
    panel = bpy.data.materials["Mat_Panel"]
    glass = bpy.data.materials["Mat_Glass"]
    trim = bpy.data.materials["Mat_Trim"]
    # Corridor frosted observation panels (Three z → Blender -y)
    # Place along long corridor stretches at eye-ish band.
    windows = [
        # x, blender_y, side (±1 for corridor wall)
        (1.42, -18.0, 1),
        (1.42, -24.0, 1),
        (1.42, -42.0, 1),
        (1.42, -66.0, 1),
        (-1.42, -18.0, -1),
        (-1.42, -26.0, -1),
        (-1.42, -44.0, -1),
        (-1.42, -70.0, -1),
        # Lobby side windows
        (3.05, -4.0, 1),
        (3.05, -7.0, 1),
        (-3.05, -4.0, -1),
        (-3.05, -7.0, -1),
    ]
    for i, (x, y, side) in enumerate(windows):
        # Recessed niche frame
        box(
            f"Prop_WinNiche_{i}",
            Vector((x, y, 1.55)),
            Vector((0.08, 1.35, 1.1)),
            trim,
        )
        box(
            f"Prop_WinGlass_{i}",
            Vector((x + side * 0.02, y, 1.55)),
            Vector((0.04, 1.2, 0.95)),
            glass,
        )
    # Recessed wall panels between windows (corridor rhythm)
    panels = [
        (1.48, -16.0),
        (1.48, -22.0),
        (1.48, -28.0),
        (1.48, -38.0),
        (1.48, -46.0),
        (1.48, -62.0),
        (1.48, -74.0),
        (-1.48, -16.0),
        (-1.48, -22.0),
        (-1.48, -30.0),
        (-1.48, -40.0),
        (-1.48, -64.0),
        (-1.48, -78.0),
    ]
    for i, (x, y) in enumerate(panels):
        box(
            f"Prop_WallPanel_{i}",
            Vector((x, y, 1.35)),
            Vector((0.05, 1.6, 1.6)),
            panel,
        )


def add_cove_strips():
    """Wall-ceiling cove light — sells enclosure without stadium flood."""
    mat = bpy.data.materials["Mat_FixtureDiff"]
    # Along corridor tops, flush under ceiling
    segments = [
        (1.48, -30.0, 0.06, 38.0),
        (-1.48, -30.0, 0.06, 38.0),
        (1.48, -76.0, 0.06, 48.0),
        (-1.48, -76.0, 0.06, 48.0),
        (3.05, -5.0, 0.06, 9.0),
        (-3.05, -5.0, 0.06, 9.0),
    ]
    for i, (x, y, sx, sy) in enumerate(segments):
        box(
            f"Prop_Cove_{i}",
            Vector((x, y, 2.88)),
            Vector((sx, sy, 0.05)),
            mat,
        )


def main():
    clear_prior_dress()
    upgrade_materials()
    thicken_ceilings()
    add_ceiling_tile_grid()
    replace_strips_with_fixtures()
    add_baseboards()
    add_door_frames()
    add_wall_panels_and_windows()
    add_cove_strips()

    blend = "/Users/kartikbazzad/Desktop/projects/openlearnia/website/games/horror-ward/blender/ward7.blend"
    glb = "/Users/kartikbazzad/Desktop/projects/openlearnia/website/public/games/horror-ward/assets/maps/ward7.glb"

    bpy.ops.wm.save_as_mainfile(filepath=blend)

    # Select MESH + EMPTY for export (keep Col_* / markers)
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.data.objects:
        if o.type in {"MESH", "EMPTY"}:
            o.hide_set(False)
            o.hide_render = False
            o.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=glb,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    dressed = sum(1 for o in bpy.data.objects if o.get(DRESS_TAG))
    print("DRESSED", dressed, "TOTAL", len(bpy.data.objects))
    print("SAVED", blend)
    print("EXPORTED", glb)


main()
