<script setup lang="ts">
import { ref } from 'vue'
import { shortDateTime } from '@/services/dateFormatService'
import { formatSeconds } from '@/services/triviaService'
import type { PanelTrivia } from '@/types/panel'

/**
 * Ranking de la trivia: más aciertos primero y, en empate, menos segundos. Sirve para
 * premiar en la fiesta; se puede descargar en CSV para Excel.
 */
const props = defineProps<{
  trivia: PanelTrivia
  timezone: string
  slug: string
  download: () => Promise<Blob>
}>()

const error = ref('')
const busy = ref(false)

async function save() {
  error.value = ''
  busy.value = true
  try {
    const blob = await props.download()
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `trivia-${props.slug}.csv`,
    }).click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo descargar.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="p-card trivia" aria-labelledby="trivia-title">
    <div class="trivia__head">
      <h2 id="trivia-title" class="p-card__title">Trivia</h2>
      <button
        v-if="trivia.ranking.length"
        type="button"
        class="p-button p-button--small"
        :disabled="busy"
        @click="save"
      >
        {{ busy ? 'Preparando…' : 'Descargar CSV' }}
      </button>
    </div>
    <p class="p-hint">
      {{ trivia.total }} {{ trivia.total === 1 ? 'pregunta' : 'preguntas' }}
      <template v-if="trivia.closes_at">
        · cierra el {{ shortDateTime(trivia.closes_at, timezone) }}
      </template>
    </p>
    <p v-if="error" class="trivia__error" role="alert">{{ error }}</p>

    <p v-if="!trivia.ranking.length" class="p-hint">
      Todavía nadie responde. El ranking aparece aquí en cuanto una invitación termina la trivia.
    </p>
    <ol v-else class="trivia__list">
      <li v-for="r in trivia.ranking" :key="r.invitation" class="trivia__item">
        <span class="trivia__rank" aria-label="Lugar">{{ r.rank }}</span>
        <p class="trivia__who">
          <strong>{{ r.name }}</strong>
          <span v-if="r.label"> · {{ r.label }}</span>
          <span> · #{{ r.invitation }}</span>
        </p>
        <p class="trivia__score">
          {{ r.correct }} de {{ r.total }}
          <span class="trivia__time">{{ formatSeconds(r.seconds) }}</span>
        </p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.trivia {
  max-width: 70rem;
  margin: 0 auto;
}
.trivia__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}
.trivia__head .p-card__title {
  margin: 0;
}
.trivia__list {
  display: grid;
  gap: 0.6rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}
.trivia__item {
  display: grid;
  grid-template-columns: 2.4rem 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--p-line);
  border-radius: 8px;
  background: var(--p-card);
}
.trivia__rank {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--p-accent);
  text-align: center;
}
.trivia__who {
  margin: 0;
  overflow-wrap: anywhere;
}
.trivia__score {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.trivia__time {
  display: block;
  color: var(--p-muted);
  font-size: 0.9rem;
  font-weight: 400;
}
.trivia__error {
  color: var(--p-error, #b3261e);
}
</style>
