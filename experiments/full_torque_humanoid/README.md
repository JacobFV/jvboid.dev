# Superseded full-torque humanoid attempt

This directory is retained only as an engineering record of an incomplete attempt. It did not produce valid learned-policy videos or a completed baseline-versus-self-modeling evaluation and therefore must not be treated as research evidence.

In particular, successful model compilation, static-equilibrium calculations, controller diagnostics, or locally stable linearizations are not substitutes for successful end-to-end learned-policy rollouts. No scientific claim should be based on this directory.

The replacement study lives in `experiments/end_to_end_morphology/` and is governed by a stricter baseline-first contract:

1. A generic recurrent policy must first learn direct actuator-level control and pass declared gates.
2. Only after that gate passes is the exact baseline cloned into matched generic-continuation and self-modeling conditions.
3. Multiple articulated morphologies and multiple physical environments are evaluated.
4. Every policy video, checkpoint, trajectory, result table, manifest, checksum, source file, and complete archive must be exported and independently validated before the work is merged or described as complete.

The files here remain available for forensic comparison, not as a completed experiment.