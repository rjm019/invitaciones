import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { timeLeft, type TimeLeft } from '@/services/countdownService'

/** Cuenta regresiva que se actualiza cada segundo y limpia su intervalo al desmontar. */
export function useCountdown(startsAt: () => string | null): Ref<TimeLeft> {
  const left = ref<TimeLeft>(timeLeft(startsAt()))
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      left.value = timeLeft(startsAt())
      if (left.value.isOver) clearInterval(timer)
    }, 1000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return left
}
