import type {
  AvatarAffect,
  AvatarDialogueState,
  AvatarMotionGroup,
} from '@/types/avatarChat';

export type Live2DEmotionKey =
  | 'neutral'
  | 'anger'
  | 'disgust'
  | 'fear'
  | 'joy'
  | 'smirk'
  | 'sadness'
  | 'surprise';

export type Live2DMotionRef = {
  group: string;
  index?: number;
  weight?: number;
};

export type Live2DParameterMap = {
  mouthOpen: string[];
  mouthSpread: string[];
  mouthRound: string[];
  mouthSmile: string[];
  mouthFrown: string[];
  angleX: string[];
  angleY: string[];
  angleZ: string[];
  bodyAngleX: string[];
  bodyAngleY: string[];
  bodyAngleZ: string[];
  eyeBallX: string[];
  eyeBallY: string[];
  eyeBallForm: string[];
  eyeEffect: string[];
  eyeLOpen: string[];
  eyeROpen: string[];
  eyeLSmile: string[];
  eyeRSmile: string[];
  eyeLForm: string[];
  eyeRForm: string[];
  browLY: string[];
  browRY: string[];
  browLX: string[];
  browRX: string[];
  browLAngle: string[];
  browRAngle: string[];
  browLForm: string[];
  browRForm: string[];
  cheek: string[];
  breath: string[];
  leftShoulderUp: string[];
  rightShoulderUp: string[];
};

export type Live2DManifest = {
  modelId: string;
  modelJsonPath: string;
  coreScriptUrl: string;
  scale: number;
  anchor: { x: number; y: number };
  position: { x: number; y: number };
  hitAreas: Record<string, string[]>;
  defaultExpression?: string;
  defaultMotionGroups: Partial<Record<AvatarMotionGroup | AvatarDialogueState, Live2DMotionRef[]>>;
  tapMotions: Partial<Record<'head' | 'face' | 'body' | 'hand' | 'chest', Live2DMotionRef[]>>;
  expressionMap: Partial<Record<AvatarAffect | Live2DEmotionKey, string[]>>;
  parameterMap: Live2DParameterMap;
};

export const LINGUAL_TUTOR_LIVE2D_MANIFEST: Live2DManifest = {
  modelId: 'mao-pro-en-live2d',
  modelJsonPath: '/avatars/live2d/mao-pro-en/mao_pro.model3.json',
  coreScriptUrl: '/live2d/core/live2dcubismcore.min.js',
  scale: 0.16,
  anchor: { x: 0.5, y: 0.18 },
  position: { x: 0.5, y: 0.34 },
  hitAreas: {
    head: ['Head', 'HitAreaHead', 'head'],
    face: ['Face', 'HitAreaHead', 'face'],
    body: ['Body', 'HitAreaBody', 'body', 'Bust'],
    hand: ['Hand', 'HitAreaHand', 'hand'],
    chest: ['Chest', 'HitAreaChest', 'chest'],
  },
  defaultExpression: 'exp_01',
  defaultMotionGroups: {
    idle: [{ group: 'Idle', index: 0, weight: 100 }],
    listening: [
      { group: 'Idle', index: 0, weight: 70 },
      { group: '', index: 0, weight: 20 },
      { group: '', index: 1, weight: 10 },
    ],
    think: [
      { group: 'Idle', index: 0, weight: 60 },
      { group: '', index: 1, weight: 25 },
      { group: '', index: 2, weight: 15 },
    ],
    thinking: [
      { group: 'Idle', index: 0, weight: 60 },
      { group: '', index: 1, weight: 25 },
      { group: '', index: 2, weight: 15 },
    ],
    talk: [
      { group: '', index: 0, weight: 38 },
      { group: '', index: 1, weight: 28 },
      { group: '', index: 2, weight: 24 },
      { group: 'Idle', index: 0, weight: 10 },
    ],
    speaking: [
      { group: '', index: 0, weight: 38 },
      { group: '', index: 1, weight: 28 },
      { group: '', index: 2, weight: 24 },
      { group: 'Idle', index: 0, weight: 10 },
    ],
    question: [
      { group: '', index: 3, weight: 45 },
      { group: '', index: 1, weight: 35 },
      { group: '', index: 2, weight: 20 },
    ],
    affirm: [
      { group: '', index: 0, weight: 35 },
      { group: '', index: 5, weight: 35 },
      { group: '', index: 1, weight: 30 },
    ],
    corrective: [
      { group: '', index: 2, weight: 40 },
      { group: '', index: 4, weight: 35 },
      { group: '', index: 3, weight: 25 },
    ],
    apology: [
      { group: '', index: 4, weight: 45 },
      { group: '', index: 2, weight: 35 },
      { group: 'Idle', index: 0, weight: 20 },
    ],
    react_head: [
      { group: '', index: 3, weight: 55 },
      { group: '', index: 5, weight: 45 },
    ],
    react_face: [
      { group: '', index: 3, weight: 45 },
      { group: '', index: 2, weight: 30 },
      { group: '', index: 5, weight: 25 },
    ],
    react_body: [
      { group: '', index: 4, weight: 45 },
      { group: '', index: 5, weight: 35 },
      { group: '', index: 0, weight: 20 },
    ],
    post_speaking: [
      { group: 'Idle', index: 0, weight: 75 },
      { group: '', index: 0, weight: 25 },
    ],
  },
  tapMotions: {
    head: [
      { group: '', index: 3, weight: 40 },
      { group: '', index: 5, weight: 35 },
      { group: '', index: 1, weight: 25 },
    ],
    face: [
      { group: '', index: 3, weight: 35 },
      { group: '', index: 2, weight: 35 },
      { group: '', index: 5, weight: 30 },
    ],
    body: [
      { group: '', index: 4, weight: 40 },
      { group: '', index: 5, weight: 35 },
      { group: '', index: 0, weight: 25 },
    ],
  },
  expressionMap: {
    neutral: ['exp_01'],
    joy: ['exp_04', 'exp_06', 'exp_02'],
    smirk: ['exp_04', 'exp_08'],
    sadness: ['exp_05', 'exp_03'],
    anger: ['exp_08', 'exp_05'],
    disgust: ['exp_08'],
    fear: ['exp_07', 'exp_05'],
    surprise: ['exp_07', 'exp_04'],
    encouraging: ['exp_04', 'exp_06', 'exp_02'],
    curious: ['exp_07', 'exp_04'],
    corrective: ['exp_08', 'exp_05'],
    affirming: ['exp_04', 'exp_06'],
    apologetic: ['exp_05', 'exp_03'],
  },
  parameterMap: {
    mouthOpen: ['ParamA'],
    mouthSpread: ['ParamI', 'ParamE'],
    mouthRound: ['ParamU', 'ParamO'],
    mouthSmile: ['ParamMouthUp'],
    mouthFrown: ['ParamMouthDown', 'ParamMouthAngry', 'ParamMouthAngryLine'],
    angleX: ['ParamAngleX'],
    angleY: ['ParamAngleY'],
    angleZ: ['ParamAngleZ'],
    bodyAngleX: ['ParamBodyAngleX'],
    bodyAngleY: ['ParamBodyAngleY'],
    bodyAngleZ: ['ParamBodyAngleZ'],
    eyeBallX: ['ParamEyeBallX'],
    eyeBallY: ['ParamEyeBallY'],
    eyeBallForm: ['ParamEyeBallForm'],
    eyeEffect: ['ParamEyeEffect'],
    eyeLOpen: ['ParamEyeLOpen'],
    eyeROpen: ['ParamEyeROpen'],
    eyeLSmile: ['ParamEyeLSmile'],
    eyeRSmile: ['ParamEyeRSmile'],
    eyeLForm: ['ParamEyeLForm'],
    eyeRForm: ['ParamEyeRForm'],
    browLY: ['ParamBrowLY'],
    browRY: ['ParamBrowRY'],
    browLX: ['ParamBrowLX'],
    browRX: ['ParamBrowRX'],
    browLAngle: ['ParamBrowLAngle'],
    browRAngle: ['ParamBrowRAngle'],
    browLForm: ['ParamBrowLForm'],
    browRForm: ['ParamBrowRForm'],
    cheek: ['ParamCheek'],
    breath: ['ParamBreath'],
    leftShoulderUp: ['ParamLeftShoulderUp'],
    rightShoulderUp: ['ParamRightShoulderUp'],
  },
};
