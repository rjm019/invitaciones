<script setup lang="ts">
import { computed } from 'vue'
import SocialPlayer from '@/components/ui/SocialPlayer.vue'
import { aspectRatio, type SocialLink } from '@/services/socialEmbedService'
import type { ResolvedSection } from '@/types/event'

/**
 * Video: YouTube, Instagram, Facebook o un MP4 propio. Se ve una portada con su botón de
 * play; el reproductor se carga solo al tocar (SocialPlayer), así abrir la invitación no
 * pide nada a esas redes. `formato` elige 16:9 u 9:16.
 */
const props = defineProps<{ section: ResolvedSection }>()

const video = computed(() => props.section.video)
const title = computed(() => props.section.title ?? 'Video')
const link = computed<SocialLink | null>(() => {
  const v = video.value
  return v?.network && v.kind && v.id && v.url
    ? { network: v.network, kind: v.kind, id: v.id, url: v.url, embed: v.embed ?? null }
    : null
})
const aspect = computed(() => aspectRatio(link.value, video.value?.format))
</script>

<template>
  <div v-if="video" class="video">
    <img v-if="section.decor.divider" :src="section.decor.divider" alt="" class="video__divider" />
    <h2 class="video__title" data-text="title">{{ title }}</h2>
    <p v-if="section.text" class="video__text" data-text="text">{{ section.text }}</p>
    <SocialPlayer
      :source="video.source"
      :link="link"
      :file="video.file"
      :poster="video.poster"
      :aspect="aspect"
      :title="title"
      :open-label="section.button"
    />
  </div>
</template>

<style scoped>
.video {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}
.video__divider {
  width: min(60%, 12rem);
}
.video__title {
  margin: 0;
  font-family: var(--t-title-font, var(--font-script));
  font-weight: 400;
  font-size: calc(clamp(2.2rem, 11.5cqi, 3.2rem) * var(--t-title-size, 1));
  line-height: 1.1;
  color: var(--t-title-color, var(--color-primary));
}
.video__text {
  max-width: 24rem;
  margin: 0;
  font-size: calc(var(--text-body) * var(--t-text-size, 1));
  line-height: 1.45;
  font-family: var(--t-text-font);
  color: var(--t-text-color);
}
</style>
