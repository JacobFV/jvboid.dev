# Full-torque humanoid self-model study

This directory reconstructs and executes a controlled comparison between two parameter-matched recurrent neural policies in MuJoCo.

The evaluated policy directly outputs every powered joint torque. There is no inverse-kinematics solver, proportional-derivative controller, scripted diagnosis menu, or motion clip beneath the learned policy during evaluation. MuJoCo computes the free-base body dynamics, gravity, inertia, ground contact, friction, balance, hand-button collision, and physical button displacement.

The expert controller inside the source exists only to generate offline imitation and DAgger labels. It is never called during a learned-policy evaluation.

`source.000.b64` and `source.001.b64` concatenate to a gzip-compressed Python source file. The workflow verifies its SHA-256 digest before executing it.
