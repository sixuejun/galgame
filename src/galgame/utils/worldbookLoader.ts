import type {
  WorldbookResources,
  BackgroundResource,
  CGResource,
  SpriteResource,
  ModelResource,
} from '../types/message';

let cachedResources: WorldbookResources | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5秒缓存

/**
 * 从世界书加载资源数据
 */
export async function loadWorldbookResources(): Promise<WorldbookResources> {
  const now = Date.now();

  // 检查缓存
  if (cachedResources && now - cacheTimestamp < CACHE_DURATION) {
    console.info('[WorldbookLoader] 使用缓存的资源数据');
    return cachedResources;
  }

  console.info('[WorldbookLoader] 开始加载世界书资源...');

  const resources: WorldbookResources = {
    backgrounds: [],
    cgs: [],
    sprites: [],
    models: new Map(),
  };

  try {
    const worldbook = getWorldbook();
    if (!worldbook || !Array.isArray(worldbook.entries)) {
      console.warn('[WorldbookLoader] 世界书不存在或格式错误');
      return resources;
    }

    for (const entry of worldbook.entries) {
      if (!entry.content) continue;

      try {
        // 尝试解析 JSON 内容
        const data = JSON.parse(entry.content);

        // 背景资源
        if (data.type === 'background' && Array.isArray(data.backgrounds)) {
          resources.backgrounds.push(...(data.backgrounds as BackgroundResource[]));
          console.info(`[WorldbookLoader] 加载了 ${data.backgrounds.length} 个背景资源`);
        }

        // CG资源
        if (data.type === 'cg' && Array.isArray(data.cgs)) {
          resources.cgs.push(...(data.cgs as CGResource[]));
          console.info(`[WorldbookLoader] 加载了 ${data.cgs.length} 个CG资源`);
        }

        // 立绘资源
        if (data.type === 'sprite' && Array.isArray(data.sprites)) {
          resources.sprites.push(...(data.sprites as SpriteResource[]));
          console.info(`[WorldbookLoader] 加载了 ${data.sprites.length} 个立绘资源`);
        }

        // Live2D模型资源
        if (data.type === 'model' && data.modelName) {
          resources.models.set(data.modelName, data as ModelResource);
          console.info(`[WorldbookLoader] 加载了模型: ${data.modelName}`);
        }
      } catch (e) {
        // 不是JSON格式，跳过
        continue;
      }
    }

    console.info('[WorldbookLoader] 资源加载完成:', {
      backgrounds: resources.backgrounds.length,
      cgs: resources.cgs.length,
      sprites: resources.sprites.length,
      models: resources.models.size,
    });

    // 更新缓存
    cachedResources = resources;
    cacheTimestamp = now;

    return resources;
  } catch (error) {
    console.error('[WorldbookLoader] 加载世界书资源失败:', error);
    return resources;
  }
}

/**
 * 清除缓存（用于测试或强制刷新）
 */
export function clearResourceCache(): void {
  cachedResources = null;
  cacheTimestamp = 0;
  console.info('[WorldbookLoader] 缓存已清除');
}
