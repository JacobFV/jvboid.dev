from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import mujoco
import numpy as np

SOURCE = Path(__file__).with_name("full_control_study.py")
spec = importlib.util.spec_from_file_location("study", SOURCE)
assert spec and spec.loader
study = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = study
spec.loader.exec_module(study)


def name(model, kind, idx):
    return mujoco.mj_id2name(model, kind, int(idx)) or f"#{idx}"


def straight_target(env):
    target = env.initial_targets.copy()
    target[:] = 0.0
    target[env.name_to_action["left_shoulder_pitch"]] = 0.0
    target[env.name_to_action["left_elbow"]] = 0.0
    return target


def set_pose(env, z, root_y=0.0, target=None):
    mujoco.mj_resetData(env.model, env.data)
    env.data.qpos[:7] = np.array([0.0, root_y, z, 1.0, 0.0, 0.0, 0.0])
    env.data.qpos[env.qpos_indices] = straight_target(env) if target is None else target
    env.data.qvel[:] = 0.0
    env.data.qacc[:] = 0.0
    env.data.ctrl[:] = 0.0
    env.data.qpos[env.button_qpos] = 0.0
    mujoco.mj_forward(env.model, env.data)


def contact_rows(env):
    rows = []
    for i in range(env.data.ncon):
        c = env.data.contact[i]
        force = np.zeros(6)
        mujoco.mj_contactForce(env.model, env.data, i, force)
        rows.append(
            {
                "index": i,
                "geom1": name(env.model, mujoco.mjtObj.mjOBJ_GEOM, c.geom1),
                "geom2": name(env.model, mujoco.mjtObj.mjOBJ_GEOM, c.geom2),
                "dist": float(c.dist),
                "pos": np.array(c.pos).copy(),
                "normal_force": float(force[0]),
                "force": force.copy(),
            }
        )
    return rows


def foot_force(rows, foot_name):
    return sum(
        max(0.0, row["normal_force"])
        for row in rows
        if "floor" in (row["geom1"], row["geom2"])
        and foot_name in (row["geom1"], row["geom2"])
    )


def report(env, z, root_y=0.0, verbose=False):
    set_pose(env, z, root_y)
    # Solve one constrained forward-dynamics state under gravity so contact
    # forces are populated, while preserving the exact candidate pose.
    mujoco.mj_forward(env.model, env.data)
    rows = contact_rows(env)
    left_force = foot_force(rows, "left_foot_geom")
    right_force = foot_force(rows, "right_foot_geom")
    flags = env._contact_flags()
    left_pos = env.data.geom_xpos[env.left_foot_geom].copy()
    right_pos = env.data.geom_xpos[env.right_foot_geom].copy()
    com = env.data.subtree_com[env.pelvis_body].copy()
    total_mass = float(env.model.body_subtreemass[env.pelvis_body])
    support_center = 0.5 * (left_pos[:2] + right_pos[:2])
    support_delta = com[:2] - support_center
    print(
        f"SUPPORT z={z:.5f} y={root_y:+.4f} ncon={env.data.ncon:2d} "
        f"flags=({flags[0]:.0f},{flags[1]:.0f}) force=({left_force:.3f},{right_force:.3f}) "
        f"feet_z=({left_pos[2]:+.5f},{right_pos[2]:+.5f}) "
        f"com=({com[0]:+.5f},{com[1]:+.5f},{com[2]:+.5f}) "
        f"support=({support_center[0]:+.5f},{support_center[1]:+.5f}) "
        f"delta=({support_delta[0]:+.5f},{support_delta[1]:+.5f}) mass={total_mass:.3f}"
    )
    if verbose:
        for row in rows:
            print(
                f"  CONTACT {row['index']:02d} {row['geom1']} <-> {row['geom2']} "
                f"dist={row['dist']:+.7f} pos={np.array2string(row['pos'], precision=5)} "
                f"normal={row['normal_force']:+.5f} force={np.array2string(row['force'], precision=4)}"
            )
    return left_force, right_force, support_delta, rows


cfg = study.StudyConfig()
env = study.FullTorqueHumanoid(cfg)
env.model.opt.integrator = mujoco.mjtIntegrator.mjINT_EULER
print(
    f"MODEL nq={env.model.nq} nv={env.model.nv} nu={env.model.nu} "
    f"left_foot_id={env.left_foot_geom} right_foot_id={env.right_foot_geom} floor_id={env.floor_geom}"
)
print("GEOMS")
for idx in range(env.model.ngeom):
    print(
        f"  {idx:02d} {name(env.model, mujoco.mjtObj.mjOBJ_GEOM, idx)} "
        f"body={name(env.model, mujoco.mjtObj.mjOBJ_BODY, env.model.geom_bodyid[idx])} "
        f"type={int(env.model.geom_type[idx])} size={np.array2string(env.model.geom_size[idx], precision=4)}"
    )

print("HEIGHT_SCAN")
valid = []
for z in np.linspace(0.925, 0.975, 51):
    left, right, delta, rows = report(env, float(z), verbose=False)
    if left > 1e-5 and right > 1e-5:
        valid.append((float(z), left, right, float(np.linalg.norm(delta)), len(rows)))
print(f"VALID_TWO_FOOT_COUNT {len(valid)}")
for row in valid[:10]:
    print("  VALID", row)
if valid:
    best = min(valid, key=lambda row: abs(row[1] - row[2]) + 100.0 * row[3])
    print("BEST_TWO_FOOT", best)
    report(env, best[0], verbose=True)
else:
    print("NO_TWO_FOOT_CANDIDATE; detailed candidates follow")
    for z in (0.925, 0.935, 0.945, 0.948, 0.955, 0.965, 0.975):
        report(env, z, verbose=True)

print("LATERAL_SCAN_AT_0948")
for y in np.linspace(-0.03, 0.03, 13):
    report(env, 0.948, float(y), verbose=False)
