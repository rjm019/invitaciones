<script setup lang="ts">
import { computed } from 'vue'
import { flutterPieces, glints, motionTime } from '@/services/effectsService'
import type { DecorSprite } from '@/types/event'

/**
 * Decoración con vida. Si el tema describe sus figuras (`sprite`):
 * - flutter: cada figura se recorta y aletea y se mece a su propio ritmo (mariposas).
 * - twinkle: la imagen brilla suave y sobre cada figura titila un destello (estrellas).
 * Sin figuras, la imagen entera flota o titila. Solo transform y opacity; con "menos
 * movimiento" se queda quieta.
 */
const props = defineProps<{ src: string; sprite?: DecorSprite; motion: 'flutter' | 'twinkle' }>()

const pieces = computed(() =>
  props.motion === 'flutter' && props.sprite?.parts?.length
    ? flutterPieces(props.sprite.parts, props.src)
    : [],
)
const stars = computed(() =>
  props.motion === 'twinkle' && props.sprite?.glints?.length
    ? glints(props.sprite.glints, props.src)
    : [],
)
</script>

<template>
  <span
    class="sprite"
    :class="`sprite--${motion}`"
    :style="sprite ? { aspectRatio: String(sprite.ratio) } : undefined"
    aria-hidden="true"
  >
    <template v-if="pieces.length">
      <img
        v-for="(p, i) in pieces"
        :key="i"
        :src="src"
        alt=""
        class="sprite__part"
        :style="{
          clipPath: p.clip,
          transformOrigin: p.origin,
          animationDuration: `${motionTime(p.drift)}, ${motionTime(p.flap)}`,
          animationDelay: `${motionTime(p.delay)}, 0s`,
        }"
      />
    </template>
    <img v-else :src="src" alt="" class="sprite__whole" />
    <span
      v-for="(g, i) in stars"
      :key="`g${i}`"
      class="sprite__glint"
      :style="{
        left: `${g.left}%`,
        top: `${g.top}%`,
        width: `${g.size}%`,
        animationDelay: motionTime(g.delay),
        animationDuration: motionTime(g.duration),
      }"
    />
  </span>
</template>

<style scoped>
/* :where: quien la usa decide la posición (absolute, por ejemplo) sin pelear especificidad. */
:where(.sprite) {
  position: relative;
  display: block;
}
.sprite__whole {
  display: block;
  width: 100%;
  height: auto;
}
.sprite__part {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Mariposas: se mecen despacio (translate, rotate) y aletean rápido (scale). */
.sprite--flutter .sprite__part {
  animation:
    sprite-drift calc(6s * var(--motion-scale)) ease-in-out infinite alternate,
    sprite-flap calc(0.5s * var(--motion-scale)) ease-in-out infinite alternate;
}
.sprite--flutter .sprite__whole {
  animation: sprite-drift calc(7s * var(--motion-scale)) ease-in-out infinite alternate;
}
@keyframes sprite-drift {
  0% {
    translate: 0 0;
    rotate: 0deg;
  }
  50% {
    translate: -4% -6%;
    rotate: -7deg;
  }
  100% {
    translate: 3% -10%;
    rotate: 5deg;
  }
}
@keyframes sprite-flap {
  from {
    scale: 1 1;
  }
  to {
    scale: 0.62 1;
  }
}

/* Estrellas: la imagen respira y cada destello nace, gira y se apaga. */
.sprite--twinkle .sprite__whole {
  animation: sprite-glow calc(3.2s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes sprite-glow {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
.sprite__glint {
  position: absolute;
  aspect-ratio: 1;
  translate: -50% -50%;
  /* El tono del destello: cálido por defecto (el de NAT); un tema lo cambia con --glint-tint. */
  background: radial-gradient(
    circle,
    #fff 0 16%,
    var(--glint-tint, #fff4c8) 34%,
    var(--color-primary-soft) 60%
  );
  clip-path: polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%);
  opacity: 0;
  animation: sprite-glint calc(2.4s * var(--motion-scale)) ease-in-out infinite;
}
@keyframes sprite-glint {
  0%,
  100% {
    opacity: 0;
    scale: 0.2;
    rotate: 0deg;
  }
  45% {
    opacity: 1;
    scale: 1;
    rotate: 45deg;
  }
  70% {
    opacity: 0;
    scale: 0.4;
    rotate: 90deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sprite__part,
  .sprite__whole,
  .sprite__glint {
    animation: none;
  }
  .sprite__glint {
    display: none;
  }
}
</style>
