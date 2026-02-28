import { mountStreamingMessages } from '@util/streaming';
import './theme.css';
import App from './App.vue';

declare global {
  interface Window {
    __galgameState?: {
      activeGenerationMesId: number | null;
      mainStore: { triggerDanmakuForMessage: (message_id: number) => Promise<void> } | null;
    };
  }
}

$(() => {
  window.__galgameState = {
    activeGenerationMesId: null,
    mainStore: null,
  };

  const { unmount } = mountStreamingMessages(
    () => createApp(App).use(createPinia()),
    { host: 'iframe' },
  );

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
      return;
    }
    const fallbackMesId = Number($('#chat').children('.mes.last_mes').attr('mesid'));
    if (Number.isNaN(fallbackMesId) || fallbackMesId !== message_id) return;
    if (generationEndedDebounceTimer != null) return;
    generationEndedDebounceTimer = setTimeout(() => {
      generationEndedDebounceTimer = null;
    }, GENERATION_ENDED_DEBOUNCE_MS);
    state.mainStore?.triggerDanmakuForMessage(message_id);
  });

  $(window).on('pagehide', () => unmount());
});
