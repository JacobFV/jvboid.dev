# End-to-end morphology self-model benchmark

This directory contains the exact executable source archive for the replacement embodied-control study.

The study is baseline-first: a generic recurrent policy must first learn direct actuator-level control and pass declared success gates for every morphology. Only then is that passing generic controller cloned into parameter-matched generic-continuation and self-modeling branches. Both branches receive the same trajectories, torque labels, baseline weights, normalization, optimizer, minibatch order, and augmentation budget; only the auxiliary prediction target differs.

During learned-policy evaluation, the neural network emits the complete MuJoCo actuator vector. No inverse kinematics, proportional-derivative controller, model-predictive controller, scripted behavior selector, motion library, trajectory replay, or expert fallback runs beneath it. The expert controller exists only for offline label generation and raises an exception if called in evaluation mode.

Implemented morphologies:

- two-link pedestal arm
- three-link redundant arm
- mobile-base two-link arm

Implemented environments:

- nominal laboratory
- heavy-payload shelf
- viscous chamber
- weak-actuator bay
- held-out combined bay

`source.000.b64` and `source.001.b64` concatenate to a Base64-encoded gzip archive. The workflow verifies SHA-256 at the chunk, concatenated archive, compressed-source, and restored-source levels before execution.

Restored source SHA-256:

`2a6b30882ac17735efedc06bc60fd1428820abe582be656c60c26215339c1d6a`

The executable fails unless all generic gates pass, every required checkpoint exists, every MP4 is nonempty H.264 with the declared dimensions, all exported checksums verify, and the complete ZIP is produced.