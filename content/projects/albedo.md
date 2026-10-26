# Flux-to-Albedo Model

**ASTR 3510, Fall 2025 · 3-person team project**

## What it is

How bright an object looks depends on its size, its distance and how reflective its surface is. Reflectivity (geometric albedo) is a clue to what a surface is made of. We built a pipeline that turns telescope images into an albedo estimate.

## Method

1. **Calibration:** dark, bias and flat-field corrections on the raw images.
2. **Aperture photometry:** measure the flux of each target.
3. **Flux ratio to the Sun:** compare the measured flux to the sunlight hitting the object.
4. **Geometric albedo:** convert that ratio into an albedo.

## Icy moons and the mystery object

We used icy moons with known albedos to calibrate and check the pipeline. The goal was to characterize a mystery object from its measured flux.

## Results

- Our model classified the mystery object, asteroid 16 Psyche, as rocky. Its real albedo is about 0.15 and it is more metallic than rocky, which showed the limits of a model with only three categories and a small training set.
- We also found no strong correlation between measured flux and geometric albedo.

## Materials

- [Final poster (PDF, Dec 2025)](../assets/docs/albedo_poster_final.pdf)
