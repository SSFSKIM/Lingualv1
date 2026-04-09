declare module '@cubism/live2dcubismframework' {
  export class Option {
    logFunction?: (message: string) => void;
    loggingLevel?: number;
  }

  export const LogLevel: {
    LogLevel_Error: number;
    LogLevel_Warning: number;
  };

  export const CubismFramework: {
    startUp(option?: Option): void;
    initialize(): void;
    dispose(): void;
    getIdManager(): {
      getId(id: string): any;
    };
  };
}

declare module '@cubism/cubismmodelsettingjson' {
  export class CubismModelSettingJson {
    constructor(buffer: ArrayBuffer, size: number);
    getModelFileName(): string;
    getExpressionCount(): number;
    getExpressionName(index: number): string;
    getExpressionFileName(index: number): string;
    getPhysicsFileName(): string;
    getPoseFileName(): string;
    getUserDataFile(): string;
    getMotionGroupCount(): number;
    getMotionGroupName(index: number): string;
    getMotionCount(group: string): number;
    getMotionFileName(group: string, index: number): string;
    getMotionFadeInTimeValue(group: string, index: number): number;
    getMotionFadeOutTimeValue(group: string, index: number): number;
    getTextureCount(): number;
    getTextureFileName(index: number): string;
    getHitAreasCount(): number;
    getHitAreaName(index: number): string;
    getHitAreaId(index: number): any;
    getEyeBlinkParameterCount(): number;
    getEyeBlinkParameterId(index: number): string;
    getLipSyncParameterCount(): number;
    getLipSyncParameterId(index: number): string;
  }
}

declare module '@cubism/math/cubismmatrix44' {
  export class CubismMatrix44 {
    loadIdentity(): void;
    setHeight(height: number): void;
    getScaleX(): number;
    getScaleY(): number;
    left(value: number): void;
    top(value: number): void;
    multiplyByMatrix(matrix: CubismMatrix44): void;
    clone(): CubismMatrix44;
  }
}

declare module '@cubism/model/cubismusermodel' {
  export class CubismUserModel {
    protected _lipsync: boolean;
    protected _debugMode: boolean;
    protected _motionManager: {
      isFinished(): boolean;
      setReservePriority(priority: number): void;
      reserveMotion(priority: number): boolean;
      startMotionPriority(motion: unknown, autoDelete: boolean, priority: number): number;
      updateMotion(model: unknown, deltaTimeSeconds: number): boolean;
    };
    protected _expressionManager: {
      startMotion(motion: unknown, autoDelete: boolean): void;
      updateMotion(model: unknown, deltaTimeSeconds: number): boolean;
    } | null;
    protected _physics: {
      evaluate(model: unknown, deltaTimeSeconds: number): void;
    } | null;
    protected _pose: {
      updateParameters(model: unknown, deltaTimeSeconds: number): void;
    } | null;
    loadModel(buffer: ArrayBuffer): void;
    loadExpression(buffer: ArrayBuffer, size: number, name: string): unknown;
    loadMotion(buffer: ArrayBuffer, size: number, name: string, priority: number): any;
    createRenderer(): void;
    getRenderer(): any;
    getModel(): any;
    getModelMatrix(): any;
    setInitialized(value: boolean): void;
    setUpdating(value: boolean): void;
    isHit(drawableId: unknown, x: number, y: number): boolean;
  }
}

declare module '@cubism/motion/acubismmotion' {
  export class ACubismMotion {
    setFadeInTime(value: number): void;
    setFadeOutTime(value: number): void;
  }
}

declare module '@cubism/motion/cubismmotion' {
  import { ACubismMotion } from '@cubism/motion/acubismmotion';

  export class CubismMotion extends ACubismMotion {}
}

declare module '@cubism/motion/cubismmotionqueuemanager' {
  export const InvalidMotionQueueEntryHandleValue: number;
}

declare module '@cubism/type/csmmap' {
  export class csmMap<K, V> extends Map<K, V> {}
}

declare module '@cubism/type/csmvector' {
  export class csmVector<T> extends Array<T> {
    getSize(): number;
    at(index: number): T;
    pushBack(value: T): void;
  }
}

declare module '@cubism/id/cubismid' {
  export type CubismIdHandle = any;
}

declare module '@cubism/rendering/cubismrenderer' {
  export const CubismRenderer: {
    staticRelease?(): void;
  };
}
