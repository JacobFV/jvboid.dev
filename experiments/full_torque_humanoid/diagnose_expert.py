from __future__ import annotations

import importlib.util
import math
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


def pd_action(env, target):
    q = env.data.qpos[env.qpos_indices]
    qv = env.data.qvel[env.dof_indices]
    kp = np.full(env.action_dim, 62.0)
    kd = np.full(env.action_dim, 7.5)
    kp[env.arm_indices] = 48.0
    kd[env.arm_indices] = 5.3
    for i, name in enumerate(env.joint_names):
        if "wrist" in name or "neck" in name:
            kp[i], kd[i] = 25.0, 3.2
        if "hip" in name or "knee" in name or "ankle" in name:
            kp[i], kd[i] = 105.0, 11.0
    generalized_bias = env.data.qfrc_bias[env.dof_indices]
    desired = kp * (target - q) - kd * qv + generalized_bias
    return np.clip((desired / np.maximum(env._applied_gain(), 0.35)) / env.ctrl_scale, -1, 1).astype(np.float32)


def pose(env, kind):
    target = env.initial_targets.copy()
    if kind == "straight":
        for side in ("right", "left"):
            target[env.name_to_action[f"{side}_hip_pitch"]] = 0.0
            target[env.name_to_action[f"{side}_knee"]] = 0.0
            target[env.name_to_action[f"{side}_ankle_pitch"]] = 0.0
    elif kind == "deeper":
        for side in ("right", "left"):
            target[env.name_to_action[f"{side}_hip_pitch"]] = -0.16
            target[env.name_to_action[f"{side}_knee"]] = 0.32
            target[env.name_to_action[f"{side}_ankle_pitch"]] = -0.16
    return target


def report_reset(env, z, kind):
    env.reset(7000, study.REGIME_CONTROL, training=False)
    env.data.qpos[2] = z
    env.data.qpos[env.qpos_indices] = pose(env, kind)
    mujoco.mj_forward(env.model, env.data)
    lf = env.data.geom_xpos[env.left_foot_geom]
    rf = env.data.geom_xpos[env.right_foot_geom]
    contacts = env._contact_flags()
    _, _, tilt = env._torso_features()
    print(
        f"RESET pose={kind:8s} z={z:.3f} pelvis={env.data.xpos[env.pelvis_body,2]:.3f} "
        f"feet_z=({lf[2]:.3f},{rf[2]:.3f}) contacts={contacts[:2]} tilt={tilt:.3f} ncon={env.data.ncon}"
    )


def rollout(env, z, kind, mode, steps=230):
    env.reset(7000, study.REGIME_CONTROL, training=False)
    env.data.qpos[2] = z
    env.data.qpos[env.qpos_indices] = pose(env, kind)
    env.initial_targets[:] = pose(env, kind)
    mujoco.mj_forward(env.model, env.data)
    min_h = 99.0
    max_tilt = 0.0
    fall_step = None
    press_step = None
    for step in range(steps):
        action = pd_action(env, env.initial_targets) if mode == "stand" else env.expert_action()
        _, info = env.step(action)
        min_h = min(min_h, info["pelvis_height"])
        max_tilt = max(max_tilt, info["torso_tilt"])
        if step in (0, 4, 9, 19, 39, 69, 99, 149, 199):
            print(
                f"  {mode:5s} pose={kind:8s} z={z:.3f} step={step:3d} t={step*env.cfg.control_dt:.2f} "
                f"h={info['pelvis_height']:.3f} tilt={info['torso_tilt']:.3f} "
                f"hand={info['hand_error']:.3f} button={info['button']:.3f} "
                f"base_v={np.linalg.norm(env.data.qvel[:6]):.3f} act={np.max(np.abs(action)):.3f} ncon={env.data.ncon}"
            )
        if info["button"] > 0.025 and press_step is None:
            press_step = step
        if study.is_fallen(info):
            fall_step = step
            break
    print(
        f"RESULT mode={mode:5s} pose={kind:8s} z={z:.3f} fall={fall_step} press={press_step} "
        f"min_h={min_h:.3f} max_tilt={max_tilt:.3f} root=({env.data.qpos[0]:.3f},{env.data.qpos[1]:.3f},{env.data.qpos[2]:.3f})"
    )


cfg = study.StudyConfig()
env = study.FullTorqueHumanoid(cfg)
print(f"MODEL nq={env.model.nq} nv={env.model.nv} nu={env.model.nu} total_mass={float(np.sum(env.model.body_mass)):.3f}")
for kind in ("current", "straight", "deeper"):
    for z in (0.94, 0.955, 0.975, 1.00, 1.025):
        report_reset(env, z, kind)
for kind in ("current", "straight", "deeper"):
    for z in (0.955, 0.975, 1.00, 1.025):
        rollout(env, z, kind, "stand", steps=120)
for kind in ("current", "straight", "deeper"):
    for z in (0.955, 0.975, 1.00, 1.025):
        rollout(env, z, kind, "reach", steps=230)
