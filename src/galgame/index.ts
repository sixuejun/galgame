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
          imageGenEnabled: boolean;
          backgroundGenEnabled: boolean;
          cgGenEnabled: boolean;
          apiTaskImageTag: 'main' | 'second' | 'disabled';
          imageGenPriority: 'cg' | 'background';
        };
        requestBackgroundImage: (prompt: string) => void;
        requestCgImage: (prompt: string) => void;
        callSecondApi: (task: string, payload: { systemPrompt: string }) => Promise<string[] | string>;
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
      state.mainStore?.triggerDanmakuForMessage(message_id);
      triggerImageGenAfterGeneration(message_id, state.mainStore);
      return;
    }
    const fallbackMesId = Number($('#chat').children('.mes.last_mes').attr('mesid'));
    if (Number.isNaN(fallbackMesId) || fallbackMesId !== message_id) return;
    if (generationEndedDebounceTimer != null) return;
    generationEndedDebounceTimer = setTimeout(() => {
      generationEndedDebounceTimer = null;
    }, GENERATION_ENDED_DEBOUNCE_MS);
    state.mainStore?.triggerDanmakuForMessage(message_id);
    triggerImageGenAfterGeneration(message_id, state.mainStore);
  });

  async function triggerImageGenAfterGeneration(
    message_id: number,
    mainStore: {
      settings: {
        imageGenEnabled: boolean;
        backgroundGenEnabled: boolean;
        cgGenEnabled: boolean;
        apiTaskImageTag: 'main' | 'second' | 'disabled';
        imageGenPriority: 'cg' | 'background';
      };
      requestBackgroundImage: (p: string) => void;
      requestCgImage: (p: string) => void;
      callSecondApi: (task: string, payload: { systemPrompt: string }) => Promise<string[] | string>;
    } | null,
  ) {
    if (!mainStore?.settings?.imageGenEnabled) return;

    const messages = getChatMessages(message_id);
    const last = messages?.[0];
    const rawMessage = last?.message ?? '';
    const context = rawMessage.trim().slice(0, 500) || 'post-apocalyptic wasteland, newspaper style';

    // 判断图片类型和插入位置
    const imageType = determineImageType(rawMessage, mainStore.settings);
    if (!imageType) return;

    let prompt = context;
    let secondApiContent = '';

    // If using second API for image tag generation
    if (mainStore.settings.apiTaskImageTag === 'second') {
      try {
        const tagPrompt = `根据以下场景描述，生成适合的图片tag（英文，逗号分隔，不超过50词）：\n${context}`;
        const result = await mainStore.callSecondApi('imageTag', { systemPrompt: tagPrompt });
        prompt = typeof result === 'string' ? result : context;
        secondApiContent = prompt;
        console.info('[ImageGen] Generated tags via second API:', prompt);
      } catch (e) {
        console.warn('[ImageGen] Failed to generate tags via second API, using context:', e);
        prompt = context;
      }
    }

    // 发送生图请求
    if (imageType === 'background') {
      mainStore.requestBackgroundImage(prompt);
      console.info('[ImageGen] Requesting background image');
    } else if (imageType === 'cg') {
      mainStore.requestCgImage(prompt);
      console.info('[ImageGen] Requesting CG image');
    } else if (imageType === 'both') {
      // 两者都存在时，根据用户设置的优先级决定
      const priority = mainStore.settings.imageGenPriority;
      if (priority === 'cg') {
        mainStore.requestCgImage(prompt);
        console.info('[ImageGen] Both detected, using CG priority');
      } else {
        mainStore.requestBackgroundImage(prompt);
        console.info('[ImageGen] Both detected, using background priority');
      }
    }

    // 将第二API内容写入消息末尾
    if (secondApiContent && last) {
      const marker = `\n<!-- 第二API生图tag: ${secondApiContent} -->`;
      const updatedMessage = last.message + marker;
      await setChatMessages([{ ...last, message: updatedMessage }], last.id);
      console.info('[ImageGen] Inserted second API content to message end');
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
