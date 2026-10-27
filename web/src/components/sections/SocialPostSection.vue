<script setup lang="ts">
import { computed } from 'vue'
import SocialPlayer from '@/components/ui/SocialPlayer.vue'
import { aspectRatio } from '@/services/socialEmbedService'
import type { ResolvedSection } from '@/types/event'

/**
 * Publicación de Instagram, Facebook o YouTube ("Síguenos en…"). Repetible. Misma fachada
 * que el video: la publicación (blockquote + embed.js de Instagram, plugin de Facebook,
 * iframe de YouTube) se carga solo al tocar; si la red la bloquea queda "Ver en <red>".
 */
const props = defineProps<{ section: ResolvedSection }>()

const post = computed(() => props.section.post)
const title = computed(() => props.section.title ?? 'Síguenos')
const aspect = computed(() => aspectRatio(post.value ?? null))
</script>

<template>
  <div v-if="post" class="post">
    <img v-if="section.decor.divider" :src="section.decor.divider" alt="" class="post__divider" />
    <h2 class="post__title" data-text="title">{{ title }}</h2>
    <p v-if="section.text" class="post__text" data-text="text">{{ section.text }}</p>
    <SocialPlayer
      :source="post.network"
      :link="post"
      :poster="post.poster"
      :aspect="aspect"
      :title="title"
      :open-label="section.button"
    />
  </div>
</template>

<style scoped>
.post {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}
.post__divider {
  width: min(60%, 12rem);
}
.post__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.post__text {
  max-width: 24rem;
  margin: 0;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  font-family: var(--t-text-font);
  color: var(--t-text-color);
}
</style>
