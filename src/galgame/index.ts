import { mountStreamingMessages } from '@util/streaming';
import App from './App.vue';
import './theme.css';

declare global {
  interface Window {
    __galgameState?: {
      activeGenerationMesId: number | null;
      mainStore: {
        triggerDanmakuForMessage: (message_id: number) => Promise<void>;
        settings: {
          danmakuEnabled: boolean;
          imageGenEnabled: boolean;
          backgroundGenEnabled: boolean;
          cgGenEnabled: boolean;
          apiTaskDanmaku: 'main' | 'second' | 'disabled';
          apiTaskImageTag: 'main' | 'second' | 'disabled';
          imageGenPriority: 'cg' | 'background';
        };
        requestBackgroundImage: (prompt: string) => void;
        requestCgImage: (prompt: string) => void;
        pushDanmaku: (text: string) => void;
        callSecondApi: (task: string, payload: any) => Promise<string[] | string>;
      } | null;
    };
  }
}

$(() => {
  window.__galgameState = {
    activeGenerationMesId: null,
    mainStore: null,
  };

  const { unmount } = mountStreamingMessages(() => createApp(App).use(createPinia()), { host: 'iframe' });

  eventOn(tavern_events.STREAM_TOKEN_RECEIVED, () => {
    const mesid = $('#chat').children('.mes.last_mes').attr('mesid');
    if (mesid != null && mesid !== '') window.__galgameState!.activeGenerationMesId = Number(mesid);
  });

  let generationEndedDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const GENERATION_ENDED_DEBOUNCE_MS = 300;

  eventOn(tavern_events.GENERATION_ENDED, (message_id: number) => {
    const state = window.__galgameState;
    if (!state) return;
    if (state.activeGenerationMesId != null) {
      if (message_id !== state.activeGenerationMesId) return;
      state.activeGenerationMesId = null;
      triggerDanmakuAndImageGen(message_id, state.mainStore);
      return;
    }
    const fallbackMesId = Number($('#chat').children('.mes.last_mes').attr('mesid'));
    if (Number.isNaN(fallbackMesId) || fallbackMesId !== message_id) return;
    if (generationEndedDebounceTimer != null) return;
    generationEndedDebounceTimer = setTimeout(() => {
      generationEndedDebounceTimer = null;
    }, GENERATION_ENDED_DEBOUNCE_MS);
    triggerDanmakuAndImageGen(message_id, state.mainStore);
  });

  /** 合并弹幕和生图为一次第二API调用 */
  async function triggerDanmakuAndImageGen(
    message_id: number,
    mainStore: {
      settings: {
        danmakuEnabled: boolean;
        imageGenEnabled: boolean;
        backgroundGenEnabled: boolean;
        cgGenEnabled: boolean;
        apiTaskDanmaku: 'main' | 'second' | 'disabled';
        apiTaskImageTag: 'main' | 'second' | 'disabled';
        imageGenPriority: 'cg' | 'background';
      };
      requestBackgroundImage: (p: string) => void;
      requestCgImage: (p: string) => void;
      pushDanmaku: (text: string) => void;
      callSecondApi: (
        task: string,
        payload: { contentText: string },
      ) => Promise<string[] | string>;
    } | null,
  ) {
    if (!mainStore) return;

    const messages = getChatMessages(message_id);
    const raw = messages[0]?.message ?? '';
    const contentMatch = raw.match(/<content>([\s\S]*?)<\/content>/);
    const contentText = contentMatch ? contentMatch[1].trim() : raw.trim();
    if (!contentText) return;

    // 检查是否需要弹幕
    const needDanmaku = mainStore.settings.danmakuEnabled && mainStore.settings.apiTaskDanmaku === 'second';

    // 检查是否需要生图
    const needImageGen = mainStore.settings.imageGenEnabled && mainStore.settings.apiTaskImageTag === 'second';

    // 如果都不需要，直接返回
    if (!needDanmaku && !needImageGen) return;

    // 判断图片类型
    const imageType = needImageGen ? determineImageType(raw, mainStore.settings) : null;

    // 如果需要弹幕但不需要生图，或者需要生图但没有检测到图片类型
    if (needDanmaku && (!needImageGen || !imageType)) {
      // 只调用弹幕
      try {
        const lines = (await mainStore.callSecondApi('danmaku', { contentText })) as string[];
        if (lines.length === 0) return;
        const minGap = 200;
        const maxGap = 3000;
        lines.forEach((text, i) => {
          const delay = i === 0 ? 0 : minGap + Math.random() * (maxGap - minGap);
          setTimeout(() => mainStore.pushDanmaku(text), delay);
        });
      } catch (e) {
        console.error('[Danmaku] Failed:', e);
      }
      return;
    }

    // 如果只需要生图
    if (!needDanmaku && needImageGen && imageType) {
      try {
        const result = await mainStore.callSecondApi('imageTag', {
          contentText,
        });
        const prompt = typeof result === 'string' ? result : contentText;
        console.info('[ImageGen] Generated tags via second API:', prompt);

        // 发送生图请求
        if (imageType === 'background') {
          mainStore.requestBackgroundImage(prompt);
        } else if (imageType === 'cg') {
          mainStore.requestCgImage(prompt);
        } else if (imageType === 'both') {
          const priority = mainStore.settings.imageGenPriority;
          if (priority === 'cg') {
            mainStore.requestCgImage(prompt);
          } else {
            mainStore.requestBackgroundImage(prompt);
          }
        }

        // 将第二API内容写入消息末尾
        const marker = `\n<!-- 第二API生图tag: ${prompt} -->`;
        const updatedMessage = messages[0].message + marker;
        await setChatMessages([{ ...messages[0], message: updatedMessage }], messages[0].id);
      } catch (e) {
        console.error('[ImageGen] Failed:', e);
      }
      return;
    }

    // 如果两者都需要，合并调用
    if (needDanmaku && needImageGen && imageType) {
      try {
        // 合并调用，同时生成弹幕和生图标签
        const result = (await mainStore.callSecondApi('danmakuAndImageGen', {
          contentText,
        })) as string;

        console.info('[DanmakuAndImageGen] Raw result:', result);

        // 解析结果（由用户在预设中定义格式，这里提供一个默认解析逻辑）
        // 假设格式为：弹幕行在前，最后一行是生图标签（以特殊标记开头，如 "IMAGE_TAG:"）
        const lines = result
          .split(/\n/)
          .map(s => s.trim())
          .filter(Boolean);
        const danmakuLines: string[] = [];
        let imageTag = '';

        for (const line of lines) {
          if (line.startsWith('IMAGE_TAG:') || line.startsWith('生图标签:')) {
            imageTag = line.replace(/^(IMAGE_TAG:|生图标签:)\s*/, '');
          } else {
            danmakuLines.push(line);
          }
        }

        // 如果没有找到特殊标记，则最后一行作为生图标签，其余作为弹幕
        if (!imageTag && lines.length > 0) {
          imageTag = lines[lines.length - 1];
          danmakuLines.length = 0;
          danmakuLines.push(...lines.slice(0, -1));
        }

        // 处理弹幕
        if (danmakuLines.length > 0) {
          const minGap = 200;
          const maxGap = 3000;
          danmakuLines.forEach((text, i) => {
            const delay = i === 0 ? 0 : minGap + Math.random() * (maxGap - minGap);
            setTimeout(() => mainStore.pushDanmaku(text), delay);
          });
        }

        // 处理生图
        if (imageTag) {
          console.info('[ImageGen] Generated tags via second API:', imageTag);

          if (imageType === 'background') {
            mainStore.requestBackgroundImage(imageTag);
          } else if (imageType === 'cg') {
            mainStore.requestCgImage(imageTag);
          } else if (imageType === 'both') {
            const priority = mainStore.settings.imageGenPriority;
            if (priority === 'cg') {
              mainStore.requestCgImage(imageTag);
            } else {
              mainStore.requestBackgroundImage(imageTag);
            }
          }

          // 将第二API内容写入消息末尾
          const marker = `\n<!-- 第二API生成: 弹幕${danmakuLines.length}条, 生图tag: ${imageTag} -->`;
          const updatedMessage = messages[0].message + marker;
          await setChatMessages([{ ...messages[0], message: updatedMessage }], messages[0].id);
        }
      } catch (e) {
        console.error('[DanmakuAndImageGen] Failed:', e);
      }
    }
  }

  /**
   * 判断图片类型和插入位置
   * 规则：
   * 1. 如果出现 CG场景块（如 [[character||角色名：xxx||CG场景：xxx||台词：xxx]]），优先判定为生成 CG
   * 2. 否则，如果出现场景变化（如 [[character||角色名：xxx||场景：xxx]]），判定为生成背景
   * 3. 若两者都存在，让用户自行设置（目前默认CG优先）
   * @returns 'background' | 'cg' | 'both' | null
   */
  function determineImageType(
    message: string,
    settings: {
      backgroundGenEnabled: boolean;
      cgGenEnabled: boolean;
    },
  ): 'background' | 'cg' | 'both' | null {
    const bgEnabled = settings.backgroundGenEnabled;
    const cgEnabled = settings.cgGenEnabled;

    if (!bgEnabled && !cgEnabled) return null;
    if (bgEnabled && !cgEnabled) return 'background';
    if (!bgEnabled && cgEnabled) return 'cg';

    // 两者都开启时，根据消息内容判断
    if (bgEnabled && cgEnabled) {
      // 检测 CG场景块
      const hasCGScene = /\[\[character\|\|[^\]]*CG场景[:：][^\]]*\]\]/i.test(message);

      // 检测场景变化（但不是CG场景）
      const hasSceneChange = /\[\[character\|\|[^\]]*场景[:：][^\]]*\]\]/i.test(message) && !hasCGScene;

      if (hasCGScene && hasSceneChange) {
        // 两者都存在，默认CG优先（用户可在设置中调整）
        return 'both';
      } else if (hasCGScene) {
        return 'cg';
      } else if (hasSceneChange) {
        return 'background';
      }

      // 都没有明确标识，默认生成背景
      return 'background';
    }

    return null;
  }

  $(window).on('pagehide', () => unmount());
});
