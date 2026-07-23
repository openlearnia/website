import {
  Scene,
  Camera,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
} from '@babylonjs/core';

/**
 * Web-performant mood stack: image processing + vignette + soft bloom.
 * Grain via filmGrain (cheap); no custom fullscreen grain shader.
 */
export function applyHorrorPost(scene: Scene, camera: Camera): DefaultRenderingPipeline {
  const pipeline = new DefaultRenderingPipeline('horrorMood', true, scene, [camera]);

  pipeline.fxaaEnabled = true;
  pipeline.samples = 1;

  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.85;
  pipeline.bloomWeight = 0.18;
  pipeline.bloomKernel = 32;
  pipeline.bloomScale = 0.5;

  pipeline.imageProcessingEnabled = true;
  const ip = pipeline.imageProcessing;
  ip.contrast = 1.2;
  ip.exposure = 0.85;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 2.4;
  ip.vignetteStretch = 0.35;
  ip.vignetteColor.set(0.01, 0.02, 0.015);
  ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

  // Subtle grain — keep low for perf / readability
  pipeline.grainEnabled = true;
  pipeline.grain.intensity = 12;
  pipeline.grain.animated = true;

  pipeline.sharpenEnabled = false;
  pipeline.chromaticAberrationEnabled = false;

  return pipeline;
}
