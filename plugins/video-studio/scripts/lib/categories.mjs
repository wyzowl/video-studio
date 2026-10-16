// The library's categories, in the order its menu lists them. Each item's code starts with its category's letter (W03
// is a widget). A module of its own so the studio helpers (studio.mjs) can use it without importing the library.

export const CATEGORIES = {
  widgets: {
    title: "Widgets",
    one: "widget",
    letter: "W",
    lede: "On-screen things that show information: cards laid over footage when the presenter makes a point, shares a number or gives a next step.",
  },
  layouts: {
    title: "Layouts",
    one: "layout",
    letter: "L",
    lede: "Ways to show one or more things on screen: the presenter beside a screen recording, two people, several clips at once. Each size gets its own arrangement.",
  },
  "text-effects": {
    title: "Text effects",
    one: "text effect",
    letter: "T",
    lede: "Ways to use text on screen: headlines, emphasis, captions, and words that sit behind or around the presenter.",
  },
  transitions: {
    title: "Transitions",
    one: "transition",
    letter: "X",
    lede: "Ways to move from one scene to the next: camera moves, masks, matched shapes and more, made to feel premium, never like slide-show effects.",
  },
  data: {
    title: "Data",
    one: "data visualisation",
    letter: "D",
    lede: "Full-screen charts, graphs and data visualisations: every common way to show numbers, and some unusual ones that make a video stand out.",
  },
};
