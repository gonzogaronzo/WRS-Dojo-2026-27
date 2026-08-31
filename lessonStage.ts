export const LESSON_STAGE_WIDTH = 1280;
export const LESSON_STAGE_HEIGHT = 720;

export interface LessonStageFit {
  scale: number;
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
}

export const fitLessonStage = (
  containerWidth: number,
  containerHeight: number,
  stageWidth = LESSON_STAGE_WIDTH,
  stageHeight = LESSON_STAGE_HEIGHT
): LessonStageFit => {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(stageWidth) ||
    !Number.isFinite(stageHeight) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    stageWidth <= 0 ||
    stageHeight <= 0
  ) {
    return {
      scale: 0,
      offsetX: 0,
      offsetY: 0,
      displayWidth: 0,
      displayHeight: 0
    };
  }

  const scale = Math.min(containerWidth / stageWidth, containerHeight / stageHeight);
  const displayWidth = stageWidth * scale;
  const displayHeight = stageHeight * scale;

  return {
    scale,
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: (containerHeight - displayHeight) / 2,
    displayWidth,
    displayHeight
  };
};
