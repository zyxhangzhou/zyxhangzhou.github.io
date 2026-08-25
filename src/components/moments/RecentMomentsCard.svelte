<script lang="ts">
  import { onMount } from "svelte";
  import { currentLocale, t } from "@/i18n";
  import { formatMomentMonthDay } from "@/toolkit/moments/formatMomentDate";
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
  import { truncateRightSidebarText } from "@/toolkit/ui/rightSidebar";
  import type { MomentFeedItem, MomentsFeedConfig } from "@/toolkit/moments/feedTypes";

  interface Props {
    feed?: Partial<MomentsFeedConfig>;
  }

  const { feed: feedInput = {} }: Props = $props();
  const feed = $derived(normalizeMomentsFeedConfig(feedInput));

  let item = $state<MomentFeedItem | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      const meta = parseMomentsMeta(await fetchMomentsJson(momentsMetaUrlCandidates(feed)));
      if (meta.pageCount < 1) return;
      const page = parseMomentsPage(await fetchMomentsJson(momentsPageUrlCandidates(feed, 1)));
      item = page.items[0] ?? null;
    } catch {
      item = null;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <p class="extra-card__text">{t("moments.loading")}</p>
{:else if item}
  {@const excerpt = item.text.replace(/\s+/g, " ").trim()}
  <ul class="extra-list">
    <li class="extra-list__item">
      <a href="/moments/" class="extra-list__link">
        <span class="extra-list__meta">
          {formatMomentMonthDay(new Date(item.date), currentLocale)}
        </span>
        <span class="extra-list__title">
          {truncateRightSidebarText(excerpt || t("moments.noContent"), 38)}
        </span>
      </a>
    </li>
  </ul>
{:else}
  <p class="extra-card__text">{t("moments.noContent")}</p>
{/if}
