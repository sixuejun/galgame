import { mountStreamingMessages } from '@util/streaming';
import App from './App.vue';
import './theme.css';

declare global {
  interface Window {
    __galgameState?: {
      activeGenerationMesId: number | null;
      mainStore: {
        triggerDanmakuForMessage: (message_id: number) => Promise<void>;
        onMessageGenerated: (message_id: number) => Promise<void>;
        settings: { 
          imageGenEnabled: boolean; 
          backgroundGenEnabled: boolean; 
          cgGenEnabled: boolean;
          apiTaskImageTag: 'main' | 'second' | 'disabled';
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
      state.mainStore?.onMessageGenerated(message_id);
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
    state.mainStore?.onMessageGenerated(message_id);
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
      }; 
      requestBackgroundImage: (p: string) => void; 
      requestCgImage: (p: string) => void;
      callSecondApi: (task: string, payload: { systemPrompt: string }) => Promise<string[] | string>;
    } | null,
  ) {
    if (!mainStore?.settings?.imageGenEnabled) return;
    
    const messages = getChatMessages(message_id);
    const last = messages?.[0];
    const context = (last?.message ?? '').trim().slice(0, 500) || 'post-apocalyptic wasteland, newspaper style';
    
    let prompt = context;
    
    // If using second API for image tag generation
    if (mainStore.settings.apiTaskImageTag === 'second') {
      try {
        const tagPrompt = `根据以下场景描述，生成适合的图片tag（英文，逗号分隔，不超过50词）：\n${context}`;
        const result = await mainStore.callSecondApi('imageTag', { systemPrompt: tagPrompt });
        prompt = typeof result === 'string' ? result : context;
        console.info('[ImageGen] Generated tags via second API:', prompt);
      } catch (e) {
        console.warn('[ImageGen] Failed to generate tags via second API, using context:', e);
        prompt = context;
      }
    }
    
    if (mainStore.settings.backgroundGenEnabled) mainStore.requestBackgroundImage(prompt);
    if (mainStore.settings.cgGenEnabled) mainStore.requestCgImage(prompt);
  }

  $(window).on('pagehide', () => unmount());
});
