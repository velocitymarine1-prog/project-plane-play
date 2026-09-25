/* run-spec.js — THE FUN-HOUSE RUN: the four rooms laid end to end, the launch, the glide · 23 September 2026 (house pass 2)
 *
 * Pure numbers (no Three.js, no DOM). kit/glide.js simulates and solves from these; house-run.html plays them;
 * house/run-sheet.html documents them. The rooms themselves live in kit/house-spec.js (each scene carries its
 * own launch window, exit gate and par); this file only places them on the run's axis and states the flight.
 *
 * The run flies toward −z. A scene's local origin sits at run z = place[key].z; local x is run x.
 * Continuity: the kitchen's front is the living room's back wall (the arch), the Pilates room's front is the
 * kitchen's back wall (the gym door), the backyard begins at the lanai's screen door. One straight hallway.
 */
export const RUN = {
  title: 'THE FUN-HOUSE RUN', tagline: 'Four rooms, one straight line through the house, one paper plane.',
  order: ['foyer', 'kitchen', 'pilates', 'backyard'],
  place: { foyer: { z: 0 }, kitchen: { z: -10.4 }, pilates: { z: -14.7 }, backyard: { z: -20.9 } },
  /* PAGE ONE in the house: scale 0.06 → 0.43 m long, 0.35 m span (a fun-house paper plane, the size of a cat);
     it collides as a sphere of 0.15 m at its centre */
  plane: { scale: 0.06, radius: 0.15 },
  /* the throw: aim (yaw, pitch), step along the launch window (x), hold to charge (power 0..1 → speed) */
  launch: { yaw: [-35, 35], pitch: [-12, 30], speed: [4, 9], charge: 1.2, step: 0.05 },
  /* the glide: a point-mass dart. lift = g·(s/trim)² perpendicular to the velocity, drag = lift/ratio along it,
     plus a vertical damping (the dart's pitch stability, so the phugoid dies out); fixed step, deterministic */
  glide: { g: 9.8, trim: 7.0, ratio: 7.0, damp: 1.1, dt: 1 / 120, maxT: 9 },
  /* what the plane does at the end of a flight, and the lettering that goes with it */
  results: { gate: 'SWISH!', crumple: 'CRUMPLE!', bonk: 'BONK!', land: 'SLIDE…', splash: 'SPLOOSH!', lost: 'GONE.' },
  /* the cameras of the run (metres; the kit's drone law scaled to a room) */
  aim: { back: 1.15, up: 0.38, fov: 62, fovPortrait: 90 },
  drone: { back: 1.5, up: 0.5, ahead: 2.5, lagPos: 6, lagLook: 9, fov: 62, fovPortrait: 90, fovBoost: 8 },
  /* THE LONG THROW (pass 3): one launch from the front step, the goal is the gate 38.5 m away; the rooms' gates are checkpoints */
  long: { par: 1, yaw: [-15, 15], note: 'the aim narrows to the doorway in front of you; pitch and power keep their full range' },
  /* the plan proof: the whole run from above-right, the good lines drawn as ink dashes */
  plan: { target: [0, 0.6, -15], yaw: 78, el: 36, dist: 25, fov: 50 },
};
/** run-frame z of a scene-local z */
export const toRunZ = (key, z) => z + RUN.place[key].z;
