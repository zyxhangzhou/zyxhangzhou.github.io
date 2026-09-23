// cannot use path alias here because unocss can not resolve it
import { defineConfig } from "./toolkit/themeConfig";

export default defineConfig({
  siteName: "Aaron Chang",
  locale: "zh-CN",
  brand: {
    title: "Aaron Chang",
    subtitle: "Stay simple, stay naive.",
    logo: "✨",
  },
  sidebar: {
    author: "Aaron Chang",
    description: "Stay simple, stay naive. 写代码，做小工具，记录学习过程。",
    social: {
      github: {
        url: "https://github.com/zyxhangzhou",
        icon: "i-ri-github-fill",
      },
      email: {
        url: "mailto:zyxhangzhou@gmail.com",
        icon: "i-ri-mail-line",
      },
      rss: {
        url: "/rss.xml",
        icon: "i-ri-rss-line",
      },
    },
  },
  footer: {
    since: 2026,
    count: true,
    powered: true,
    icp: {
      enable: false,
    },
  },
  visibilityTitle: {
    enable: true,
    leaveTitle: "👀 你先忙，我等你回来~",
    returnTitle: "🎉 欢迎回来！",
    restoreDelay: 3000,
  },
  cover: {
    fixedCover: {
      enable: false,
    },
    // 亮色用日间高调画面，暗色用夜景和暮色，避免一套图硬套两种主题。
    themedCovers: {
      light: ["cover-4", "cover-5", "cover-3", "cover-1"],
      dark: ["cover-2", "cover-6"],
    },
  },
  home: {
    selectedCategories: [{ name: "Getting Started" }],
    pageSize: 5,
  },
  comments: {
    enable: false,
  },
});
