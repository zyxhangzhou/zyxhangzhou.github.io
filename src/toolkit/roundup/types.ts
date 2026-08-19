export type RoundupCatalogItem = {
  id: string;
  url: string;
  author: string;
  text: string;
};

export type RoundupNote = {
  id: string;
  section: string;
  headline: string;
  explain: string;
  takeaways: string[];
};

export type RoundupPlan = {
  title: string;
  description: string;
  intro: string;
  items: RoundupNote[];
};

export type RoundupRenderContext = {
  weekStartLabel: string;
  weekEndLabel: string;
  tweetCount: number;
};
