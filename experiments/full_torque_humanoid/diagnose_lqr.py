from __future__ import annotations

import importlib.util
import math
import sys
from pathlib import Path

import mujoco
import numpy as np
import scipy.linalg

SOURCE = Path(__file__).with_name("full_control_study.py")
spec = importlib.util.spec_from_file_location("study", SOURCE)
assert spec and spec.loader
study = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = study
spec.loader.exec_module(study)


def straight_target(env):
    target = env.initial_targets.copy()
    for side in ("right", "left"):
        target[env.name_to_action[f"{side}_hip_yaw"]] = 0.0
        target[env.name_to_action[f"{side}_hip_roll"]] = 0.0
        target[env.name_to_action[f"{side}_hip_pitch"]] = 0.0
        target[env.name_to_action[f"{side}_knee"]] = 0.0
        target[env.name_to_action[f"{side}_ankle_pitch"]] = 0.0
        target[env.name_to_action[f"{side}_ankle_roll"]] = 0.0
    return target


def set_pose(env, z, target):
    mujoco.mj_resetData(env.model, env.data)
    env.data.qpos[:7] = np.array([0.0, 0.0, z, 1.0, 0.0, 0.0, 0.0])
    env.data.qpos[env.qpos_indices] = target
    env.data.qvel[:] = 0.0
    env.data.qacc[:] = 0.0
    env.data.qpos[env.button_qpos] = 0.0
    env.data.ctrl[:] = 0.0
    mujoco.mj_forward(env.model, env.data)


def find_equilibrium(env, target):
    candidates = []
    for z in np.linspace(0.948, 0.963, 151):
        set_pose(env, float(z), target)
        mujoco.mj_inverse(env.model, env.data)
        root_residual = env.data.qfrc_inverse[:6].copy()
        feet = env._contact_flags()[:2]
        score = float(np.linalg.norm(root_residual)) + (0.0 if min(feet) > 0.5 else 1e5)
        candidates.append((score, float(z), root_residual.copy(), env.data.ncon))
    score, z, root, ncon = min(candidates, key=lambda row: row[0])
    set_pose(env, z, target)
    env.data.qacc[:] = 0.0
    mujoco.mj_inverse(env.model, env.data)
    qpos0 = env.data.qpos.copy()
    qfrc0 = env.data.qfrc_inverse.copy()
    ctrl0 = qfrc0[env.dof_indices].copy()
    ctrl0 = np.clip(ctrl0, env.ctrl_low, env.ctrl_high)
    env.data.ctrl[:] = ctrl0
    mujoco.mj_forward(env.model, env.data)
    print(
        "EQUILIBRIUM",
        f"z={z:.6f}",
        f"score={score:.6f}",
        f"root_residual={np.array2string(root, precision=4)}",
        f"ncon={ncon}",
        f"ctrl_max={np.max(np.abs(ctrl0 / env.ctrl_scale)):.4f}",
    )
    return qpos0, ctrl0


def build_lqr(env, qpos0, ctrl0):
    model, data = env.model, env.data
    data.qpos[:] = qpos0
    data.qvel[:] = 0.0
    data.ctrl[:] = ctrl0
    mujoco.mj_forward(model, data)

    nv, nu = model.nv, model.nu
    A = np.zeros((2 * nv, 2 * nv))
    B = np.zeros((2 * nv, nu))
    mujoco.mjd_transitionFD(model, data, 1e-6, True, A, B, None, None)

    jac_com = np.zeros((3, nv))
    mujoco.mj_jacSubtreeCom(model, data, jac_com, env.pelvis_body)
    left_site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, "left_foot_site")
    right_site = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_SITE, "right_foot_site")
    jac_left = np.zeros((3, nv))
    jac_right = np.zeros((3, nv))
    mujoco.mj_jacSite(model, data, jac_left, None, left_site)
    mujoco.mj_jacSite(model, data, jac_right, None, right_site)
    jac_support = 0.5 * (jac_left + jac_right)
    jac_diff = jac_com[:2] - jac_support[:2]
    Qbalance = jac_diff.T @ jac_diff

    Qpos = 1800.0 * Qbalance + 0.12 * np.eye(nv)
    Qpos[:3, :3] += 1.0 * np.eye(3)
    Qpos[3:6, 3:6] += 90.0 * np.eye(3)
    for name in env.joint_names:
        dof = int(env.model.jnt_dofadr[env.model.actuator_trnid[env.name_to_action[name], 0]])
        if any(token in name for token in ("hip", "knee", "ankle", "waist")):
            Qpos[dof, dof] += 4.0
        elif name.startswith("right_shoulder") or name.startswith("right_elbow") or name.startswith("right_wrist"):
            Qpos[dof, dof] += 0.08
        else:
            Qpos[dof, dof] += 0.35

    Qvel = 0.05 * np.eye(nv)
    Qvel[:6, :6] += 2.5 * np.eye(6)
    Q = np.block([[Qpos, np.zeros((nv, nv))], [np.zeros((nv, nv)), Qvel]])
    R = 0.018 * np.eye(nu)

    P = scipy.linalg.solve_discrete_are(A, B, Q, R)
    K = np.linalg.solve(R + B.T @ P @ B, B.T @ P @ A)
    spectral_radius = float(np.max(np.abs(np.linalg.eigvals(A - B @ K))))
    print(
        "LQR",
        f"A={A.shape}",
        f"B={B.shape}",
        f"K={K.shape}",
        f"spectral_radius={spectral_radius:.6f}",
        f"gain_max={np.max(np.abs(K)):.3f}",
    )
    return K


def reach_reference(env, qpos0, t):
    qref = qpos0.copy()
    target = straight_target(env)
    reach = study.smoothstep(np.clip((t - 0.65) / 1.75, 0.0, 1.0))
    button_pos = env.data.site_xpos[env.button_site].copy()
    shoulder_id = mujoco.mj_name2id(env.model, mujoco.mjtObj.mjOBJ_BODY, "right_shoulder_yaw_body")
    shoulder_pos = env.data.xpos[shoulder_id].copy()
    dx = float(button_pos[0] - shoulder_pos[0] - 0.010)
    dz = float(button_pos[2] - shoulder_pos[2])
    dy = float(button_pos[1] - shoulder_pos[1])
    shoulder_pitch, elbow, wrist_pitch = study.planar_arm_ik(dx, dz, 0.31, 0.36)
    shoulder_yaw = float(np.clip(math.atan2(dy, max(0.15, dx)), -0.55, 0.55))
    target[env.name_to_action["right_shoulder_yaw"]] = reach * shoulder_yaw
    target[env.name_to_action["right_shoulder_pitch"]] = reach * shoulder_pitch
    target[env.name_to_action["right_elbow"]] = reach * elbow
    target[env.name_to_action["right_wrist_pitch"]] = reach * wrist_pitch
    target[env.name_to_action["waist_pitch"]] = -0.05 * reach
    target[env.name_to_action["left_shoulder_pitch"]] = 0.08 + 0.12 * reach
    target[env.name_to_action["left_elbow"]] = -0.10 - 0.18 * reach
    qref[env.qpos_indices] = target
    return qref


def controller(env, qpos0, ctrl0, K, mode):
    qref = qpos0 if mode == "stand" else reach_reference(env, qpos0, env.step_count * env.cfg.control_dt)
    dq = np.zeros(env.model.nv)
    mujoco.mj_differentiatePos(env.model, dq, 1.0, qref, env.data.qpos)
    dx = np.hstack((dq, env.data.qvel))
    ctrl = ctrl0 - K @ dx
    return np.clip(ctrl / env.ctrl_scale, -1.0, 1.0).astype(np.float32)


def rollout(env, qpos0, ctrl0, K, mode, seed, steps=250, perturb=False):
    env.reset(seed, study.REGIME_CONTROL, training=False)
    env.initial_targets[:] = straight_target(env)
    env.data.qpos[:] = qpos0
    env.data.qvel[:] = 0.0
    env.data.ctrl[:] = ctrl0
    env.previous_action.fill(0.0)
    env.step_count = 0
    mujoco.mj_forward(env.model, env.data)

    min_h, max_tilt = 99.0, 0.0
    press_step = fall_step = None
    for step in range(steps):
        if perturb and step == 45:
            env.data.qvel[0] += 0.16
            env.data.qvel[1] -= 0.12
            env.data.qvel[4] += 0.10
        action = controller(env, qpos0, ctrl0, K, mode)
        _, info = env.step(action)
        min_h = min(min_h, info["pelvis_height"])
        max_tilt = max(max_tilt, info["torso_tilt"])
        if step in (0, 9, 24, 49, 74, 99, 149, 199, 229):
            print(
                f"  {mode:5s} seed={seed} step={step:3d} t={step*env.cfg.control_dt:.2f} "
                f"h={info['pelvis_height']:.3f} tilt={info['torso_tilt']:.3f} "
                f"hand={info['hand_error']:.3f} button={info['button']:.3f} "
                f"root=({env.data.qpos[0]:+.3f},{env.data.qpos[1]:+.3f}) "
                f"act={np.max(np.abs(action)):.3f} ncon={env.data.ncon}"
            )
        if info["button"] > 0.025 and press_step is None:
            press_step = step
        if study.is_fallen(info):
            fall_step = step
            break
    print(
        f"RESULT mode={mode} seed={seed} perturb={perturb} fall={fall_step} press={press_step} "
        f"min_h={min_h:.3f} max_tilt={max_tilt:.3f} final_button={env.data.qpos[env.button_qpos]:.4f}"
    )
    return fall_step is None, press_step


cfg = study.StudyConfig()
env = study.FullTorqueHumanoid(cfg)
target = straight_target(env)
qpos0, ctrl0 = find_equilibrium(env, target)
K = build_lqr(env, qpos0, ctrl0)

stand_success = 0
for seed in (7000, 7001, 7002):
    ok, _ = rollout(env, qpos0, ctrl0, K, "stand", seed, steps=230, perturb=(seed == 7002))
    stand_success += int(ok)
print(f"STAND_SUMMARY success={stand_success}/3")

reach_success = 0
for seed in (7100, 7101, 7102):
    ok, pressed = rollout(env, qpos0, ctrl0, K, "reach", seed, steps=230)
    reach_success += int(ok and pressed is not None)
print(f"REACH_SUMMARY success={reach_success}/3")

if stand_success < 3:
    raise RuntimeError("LQR did not stabilize all standing trials")
if reach_success < 2:
    raise RuntimeError("LQR-stabilized reach did not press the button reliably")
