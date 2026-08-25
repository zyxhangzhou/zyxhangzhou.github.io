<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "@/i18n";
  import MomentFeedCard from "./MomentFeedCard.svelte";
  import {
    normalizeMomentsFeedConfig,
    parseMomentsMeta,
    parseMomentsPage,
  } from "@/toolkit/moments/feedStore";
  import {
    fetchMomentsJson,
    momentsMetaUrlCandidates,
    momentsPageUrlCandidates,
  } from "@/toolkit/moments/feedClient";
  import type { MomentFeedItem, MomentsFeedConfig, MomentsFeedMeta } from "@/toolkit/moments/feedTypes";

  interface Props {
    feed?: Partial<MomentsFeedConfig>;
    initialPage?: number;
  }

  const { feed: feedInput = {}, initialPage = 1 }: Props = $props();
  const feed = $derived(normalizeMomentsFeedConfig(feedInput));

  let meta = $state<MomentsFeedMeta | null>(null);
  let items = $state<MomentFeedItem[]>([]);
  let currentPage = $state(1);
  let loading = $state(true);
  let error = $state("");

  async function loadPage(page: number) {
    loading = true;
    error = "";
    try {
      const nextMeta = parseMomentsMeta(await fetchMomentsJson(momentsMetaUrlCandidates(feed)));
      meta = nextMeta;

      if (nextMeta.pageCount === 0) {
        items = [];
        currentPage = 1;
        return;
      }

      const safePage = Math.min(Math.max(1, page), nextMeta.pageCount);
      const pagePayload = parseMomentsPage(
        await fetchMomentsJson(momentsPageUrlCandidates(feed, safePage)),
      );
      items = pagePayload.items;
      currentPage = safePage;

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (safePage <= 1) {
          url.searchParams.delete("page");
        } else {
          url.searchParams.set("page", String(safePage));
        }
        window.history.replaceState({}, "", url);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      items = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const fromQuery =
      typeof window !== "undefined"
        ? Number.parseInt(new URL(window.location.href).searchParams.get("page") || "", 10)
        : Number.NaN;
    const startPage = Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : Math.max(1, initialPage);
    void loadPage(startPage);
  });
</script>

<div class="moments-wrapper">
  <div class="moments-timeline">
    {#if loading}
      <div class="moments-status text-grey-5 bg-grey-0">
        <p>{t("moments.loading")}</p>
      </div>
    {:else if error}
      <div class="moments-status text-grey-5 bg-grey-0">
        <p>{t("moments.loadError")}</p>
        <button type="button" class="retry" onclick={() => loadPage(currentPage)}>
          {t("moments.retry")}
        </button>
      </div>
    {:else if items.length === 0}
      <div class="moments-status text-grey-5 bg-grey-0">
        <p>{t("moments.noContent")}</p>
      </div>
    {:else}
      {#each items as item (item.id)}
        <MomentFeedCard {item} {feed} />
      {/each}
    {/if}
  </div>

  {#if meta && meta.pageCount > 1 && !loading && !error}
    <nav class="moments-pager" aria-label={t("moments.pagination")}>
      <button
        type="button"
        class="pager-btn"
        disabled={currentPage <= 1}
        onclick={() => loadPage(currentPage - 1)}
      >
        {t("pagination.prev")}
      </button>
      <span class="pager-status">
        {currentPage} / {meta.pageCount}
      </span>
      <button
        type="button"
        class="pager-btn"
        disabled={currentPage >= meta.pageCount}
        onclick={() => loadPage(currentPage + 1)}
      >
        {t("pagination.next")}
      </button>
    </nav>
  {/if}
</div>

<style>
  .moments-wrapper {
    max-width: 48rem;
    margin: 0 auto;
  }

  .moments-timeline {
    position: relative;
    padding-left: 1.5rem;
  }

  .moments-timeline::before {
    content: "";
    position: absolute;
    left: 0.35rem;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 0.125rem;
    background: linear-gradient(to bottom, var(--color-pink), var(--color-orange));
    opacity: 0.35;
  }

  .moments-status {
    padding: 2rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .retry,
  .pager-btn {
    margin-top: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    padding: 0.4rem 0.9rem;
    background: linear-gradient(to right, var(--color-pink), var(--color-orange));
    color: var(--grey-0);
    cursor: pointer;
  }

  .pager-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .moments-pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .pager-status {
    color: var(--grey-5);
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .moments-wrapper {
      padding: 0 0.5rem;
    }
  }
</style>
