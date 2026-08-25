<script lang="ts">
  import { currentLocale, t } from "@/i18n";
  import { formatMomentDateTime } from "@/toolkit/moments/formatMomentDate";
  import {
    resolveMomentImageUrl,
  } from "@/toolkit/moments/feedStore";
  import type { MomentFeedItem, MomentsFeedConfig } from "@/toolkit/moments/feedTypes";

  interface Props {
    item: MomentFeedItem;
    feed: MomentsFeedConfig;
  }

  const { item, feed }: Props = $props();

  const images = $derived(
    item.images
      .map((image) => resolveMomentImageUrl(image, feed))
      .filter(Boolean),
  );
  const dateLabel = $derived(formatMomentDateTime(new Date(item.date), currentLocale));
</script>

<article class="moment-card bg-grey-0">
  <div class="timeline-dot"></div>

  <div class="moment-header">
    <span class="moment-date text-grey-5">
      <i class="i-ri-calendar-line"></i>
      {dateLabel}
    </span>
  </div>

  <div class="moment-content text-color">
    {#if item.text}
      <div class="moment-text">{item.text}</div>
    {/if}

    {#if images.length > 0}
      <div class="moment-images" data-count={images.length} data-image-zoom-gallery>
        {#each images as src, index (src)}
          <div class="image-wrapper bg-grey-2">
            <image-zoom>
              <img
                {src}
                alt={t("moments.imageAlt", { index: index + 1 })}
                loading="lazy"
                decoding="async"
                class="moment-image"
              />
            </image-zoom>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</article>

<style>
  .moment-card {
    position: relative;
    padding: 1.5rem;
    padding-left: 2rem;
    border-radius: 0.75rem;
    box-shadow: var(--shadow-card-soft);
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
    animation: slideUpIn 0.4s ease-out forwards;
    opacity: 0;
  }

  .moment-card:hover {
    transform: translateX(0.5rem);
    box-shadow: var(--shadow-card-soft-hover);
  }

  @keyframes slideUpIn {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .timeline-dot {
    position: absolute;
    left: -1.575rem;
    top: 1.75rem;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-pink), var(--color-orange));
    box-shadow: 0 0 0 0.25rem var(--grey-0);
    z-index: var(--z-elevated);
  }

  .moment-header {
    margin-bottom: 0.75rem;
  }

  .moment-date {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .moment-date i {
    font-size: 0.75rem;
  }

  .moment-text {
    font-size: 1rem;
    line-height: 1.75;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .moment-images {
    display: grid;
    gap: 0.5rem;
    margin-top: 1rem;
    max-width: 100%;
  }

  .moment-images[data-count="1"] {
    grid-template-columns: 1fr;
    max-width: 24rem;
  }

  .moment-images[data-count="2"] {
    grid-template-columns: repeat(2, 1fr);
  }

  .moment-images[data-count="3"] {
    grid-template-columns: repeat(3, 1fr);
  }

  .moment-images[data-count="4"],
  .moment-images[data-count="5"],
  .moment-images[data-count="6"] {
    grid-template-columns: repeat(2, 1fr);
  }

  .moment-images[data-count="7"],
  .moment-images[data-count="8"],
  .moment-images[data-count="9"] {
    grid-template-columns: repeat(3, 1fr);
  }

  .image-wrapper {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 0.5rem;
  }

  .image-wrapper :global(image-zoom) {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    max-width: none;
    margin: 0;
    overflow: hidden;
    border-radius: inherit;
    line-height: 0;
  }

  .image-wrapper :global(image-zoom > img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    aspect-ratio: 1;
  }

  .moment-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .image-wrapper:hover .moment-image {
    transform: scale(1.05);
  }

  @media (max-width: 480px) {
    .moment-card {
      padding: 1rem;
      padding-left: 1.5rem;
    }

    .moment-images {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .moment-images[data-count="1"] {
      grid-template-columns: 1fr !important;
    }
  }
</style>
