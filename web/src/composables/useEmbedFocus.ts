import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Avisa cuando la persona toca dentro de un iframe (por ejemplo, el play de Spotify). El
 * iframe es de otro sitio y no se pueden leer sus clics, pero al tocarlo la página pierde
 * el foco y el iframe queda como elemento activo. Sirve para pausar la canción de la
 * invitación y que no suenen dos a la vez.
 */
export function useEmbedFocus(iframe: Ref<HTMLIFrameElement | null>, onEnter: () => void) {
  const onBlur = () => {
    // El navegador mueve el foco al iframe justo después del blur.
    setTimeout(() => {
      if (iframe.value && document.activeElement === iframe.value) onEnter()
    }, 0)
  }
  onMounted(() => window.addEventListener('blur', onBlur))
  onBeforeUnmount(() => window.removeEventListener('blur', onBlur))
}
