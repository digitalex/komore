import type { ThemeDocument } from './lib/theme-model';

// Exact current project snapshot. Keep the internal theme identity for preview behavior.
export const theme: ThemeDocument = {
  "schemaVersion": 2,
  "name": "Untitled",
  "theme": {
    "name": "Atlas",
    "text": {
      "l": {
        "size": 23.28,
        "lineHeight": 31.04
      },
      "m": {
        "size": 15.52,
        "lineHeight": 23.28
      },
      "s": {
        "size": 13.58,
        "lineHeight": 19.4
      },
      "xl": {
        "size": 34.92,
        "lineHeight": 38.8
      },
      "xs": {
        "size": 11.64,
        "lineHeight": 15.52
      },
      "xxl": {
        "size": 46.56,
        "lineHeight": 50.44
      },
      "xxs": {
        "size": 9.7,
        "lineHeight": 13.58
      }
    },
    "fonts": {
      "ui": {
        "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
        "weights": {
          "heavy": 600,
          "medium": 500,
          "regular": 400
        }
      },
      "data": {
        "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
        "weights": {
          "heavy": 600,
          "medium": 500,
          "regular": 400
        }
      },
      "brand": {
        "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
        "weights": {
          "heavy": 600,
          "medium": 500,
          "regular": 400
        }
      },
      "editorial": {
        "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
        "weights": {
          "heavy": 600,
          "medium": 500,
          "regular": 400
        }
      }
    },
    "border": {
      "l": 0,
      "m": 0,
      "s": 0,
      "none": 0
    },
    "colors": {
      "dark": {
        "error": "#fc032d",
        "color-1": "#00b7c4",
        "color-2": "#094b58",
        "color-3": "#ffb579",
        "color-4": "#c1f3ed",
        "success": "#00906c",
        "warning": "#ffea00",
        "neutral-1": "#000000",
        "neutral-2": "#202020",
        "neutral-3": "#2b2b2b",
        "neutral-4": "#3d3d3d",
        "neutral-5": "#565656",
        "neutral-6": "#838383",
        "neutral-7": "#ababab",
        "neutral-8": "#cfcfcf",
        "neutral-9": "#f4f4f4",
        "neutral-10": "#ffffff"
      },
      "light": {
        "error": "#fc032d",
        "color-1": "#00b7c4",
        "color-2": "#094b58",
        "color-3": "#ffb579",
        "color-4": "#c1f3ed",
        "success": "#00906c",
        "warning": "#ffea00",
        "neutral-1": "#ffffff",
        "neutral-2": "#fbfbfb",
        "neutral-3": "#f4f4f4",
        "neutral-4": "#e7e7e7",
        "neutral-5": "#cdcdcd",
        "neutral-6": "#a1a1a1",
        "neutral-7": "#7d7d7d",
        "neutral-8": "#555555",
        "neutral-9": "#333333",
        "neutral-10": "#000000"
      }
    },
    "radius": {
      "l": 16.96,
      "m": 10.96,
      "s": 6.96,
      "xl": 26.96,
      "xs": 3.48,
      "full": 9999,
      "zero": 0
    },
    "shadows": {
      "l": {
        "x": 0,
        "y": 16,
        "blur": 48,
        "color": {
          "dark": "neutral-1",
          "light": "neutral-10"
        },
        "spread": 0,
        "opacity": 0
      },
      "m": {
        "x": 0,
        "y": 8,
        "blur": 24,
        "color": {
          "dark": "neutral-1",
          "light": "neutral-10"
        },
        "spread": 0,
        "opacity": 12
      },
      "s": {
        "x": 0,
        "y": 2,
        "blur": 4,
        "color": {
          "dark": "neutral-1",
          "light": "neutral-10"
        },
        "spread": 0,
        "opacity": 0
      }
    },
    "spacing": {
      "l": 22.116,
      "m": 14.744,
      "s": 11.058,
      "xl": 29.488,
      "xs": 7.372,
      "xxl": 44.232,
      "xxs": 3.686,
      "zero": 0
    },
    "animation": {
      "large": {
        "easing": [
          0.22,
          1,
          0.36,
          1
        ],
        "duration": 360
      },
      "easing": [
        0.16,
        1,
        0.3,
        1
      ],
      "duration": 200,
      "popupScale": 0.96,
      "pressDistance": 1
    },
    "iconStyle": "outlined",
    "iconFamily": "Central",
    "neutralTone": "neutral",
    "buttonRadius": "s",
    "colorEmphasis": 37,
    "letterSpacing": {
      "l": 0.01,
      "m": 0,
      "s": -0.01,
      "xl": 0.02,
      "xs": -0.02
    },
    "primaryForeground": {
      "dark": "neutral-2",
      "light": "neutral-2"
    },
    "primaryActionColor": "neutral-10",
    "colorPalettes": [
      {
        "id": "atlas-party",
        "name": "Party orange",
        "description": "Orange with deep blue, clear sky, and soft peach.",
        "colors": {
          "light": [
            "#ff5a00",
            "#153d85",
            "#bfe8f5",
            "#ffd0b0"
          ],
          "dark": [
            "#ff5a00",
            "#153d85",
            "#bfe8f5",
            "#ffd0b0"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-nectarine",
        "name": "Nectarine",
        "description": "Golden orange with pine, peach, and a little violet.",
        "colors": {
          "light": [
            "#ff9800",
            "#00906c",
            "#ffd3af",
            "#5100c0"
          ],
          "dark": [
            "#ff9800",
            "#00906c",
            "#ffd3af",
            "#5100c0"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-caramel",
        "name": "Caramel",
        "description": "Warm caramel with deep blue, lavender, and pale apricot.",
        "colors": {
          "light": [
            "#cf9148",
            "#07376b",
            "#c9b8f5",
            "#ffe0b8"
          ],
          "dark": [
            "#cf9148",
            "#07376b",
            "#c9b8f5",
            "#ffe0b8"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-ochre",
        "name": "Ochre",
        "description": "Golden ochre with deep green, cornflower, and soft butter yellow.",
        "colors": {
          "light": [
            "#d4b441",
            "#085e55",
            "#91b9fa",
            "#fff0b8"
          ],
          "dark": [
            "#d4b441",
            "#085e55",
            "#91b9fa",
            "#fff0b8"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-summer",
        "name": "Summer yellow",
        "description": "Sunny yellow grounded by violet and softened with pink and green.",
        "colors": {
          "light": [
            "#ffea00",
            "#5100c0",
            "#ffc0ff",
            "#398574"
          ],
          "dark": [
            "#ffea00",
            "#5100c0",
            "#ffc0ff",
            "#398574"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-kryptonite",
        "name": "Kryptonite",
        "description": "Electric lime with deep green, petal pink, and a cool blue.",
        "colors": {
          "light": [
            "#abff5a",
            "#085e55",
            "#ffc0ff",
            "#80d8e8"
          ],
          "dark": [
            "#abff5a",
            "#085e55",
            "#ffc0ff",
            "#80d8e8"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-leaf",
        "name": "Leaf green",
        "description": "Bright leaf green with violet, soft lilac, and pale yellow.",
        "colors": {
          "light": [
            "#6dcc00",
            "#5100c0",
            "#ddc7ff",
            "#ffed9b"
          ],
          "dark": [
            "#6dcc00",
            "#5100c0",
            "#ddc7ff",
            "#ffed9b"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-fresh",
        "name": "Fresh green",
        "description": "Lively green with deep blue, petal pink, and mint.",
        "colors": {
          "light": [
            "#00c853",
            "#07376b",
            "#ffb8da",
            "#b6ebd8"
          ],
          "dark": [
            "#00c853",
            "#07376b",
            "#ffb8da",
            "#b6ebd8"
          ]
        },
        "primaryForeground": {
          "light": "neutral-10",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-pine",
        "name": "Pine green",
        "description": "Rich green with lime, honey, and a dark blue anchor.",
        "colors": {
          "light": [
            "#00906c",
            "#abff5a",
            "#ffd56a",
            "#123d5c"
          ],
          "dark": [
            "#00906c",
            "#abff5a",
            "#ffd56a",
            "#123d5c"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-deep-green",
        "name": "Deep green",
        "description": "A dark green base with bright orange, mint, and butter yellow.",
        "colors": {
          "light": [
            "#085e55",
            "#ff5a00",
            "#b6ebd8",
            "#ffed9b"
          ],
          "dark": [
            "#085e55",
            "#ff5a00",
            "#b6ebd8",
            "#ffed9b"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-9"
        }
      },
      {
        "id": "atlas-turquoise",
        "name": "Turquoise",
        "description": "Clear turquoise with dark teal, apricot, and pale aqua.",
        "colors": {
          "light": [
            "#00b7c4",
            "#094b58",
            "#ffb579",
            "#c1f3ed"
          ],
          "dark": [
            "#00b7c4",
            "#094b58",
            "#ffb579",
            "#c1f3ed"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-daybreak",
        "name": "Daybreak",
        "description": "Clear cyan with deep blue, pale lilac, and warm orange.",
        "colors": {
          "light": [
            "#00e1f3",
            "#153d85",
            "#c9b8f5",
            "#ff9800"
          ],
          "dark": [
            "#00e1f3",
            "#153d85",
            "#c9b8f5",
            "#ff9800"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-sky",
        "name": "Sky blue",
        "description": "Fresh sky blue with deep green, butter yellow, and soft coral.",
        "colors": {
          "light": [
            "#00afe8",
            "#085e55",
            "#ffed9b",
            "#ffb5aa"
          ],
          "dark": [
            "#00afe8",
            "#085e55",
            "#ffed9b",
            "#ffb5aa"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-azure",
        "name": "Azure",
        "description": "Bright azure with navy, pale lime, and peach.",
        "colors": {
          "light": [
            "#0088ff",
            "#07376b",
            "#d4f5a4",
            "#ffd0b0"
          ],
          "dark": [
            "#0088ff",
            "#07376b",
            "#d4f5a4",
            "#ffd0b0"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-navy",
        "name": "Navy",
        "description": "Deep navy with vivid orange, clear sky, and pale yellow.",
        "colors": {
          "light": [
            "#07376b",
            "#ff5a00",
            "#87d8f5",
            "#ffed9b"
          ],
          "dark": [
            "#07376b",
            "#ff5a00",
            "#87d8f5",
            "#ffed9b"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-9"
        }
      },
      {
        "id": "atlas-monochrome",
        "name": "Monochrome",
        "description": "Soft black, graphite, silver, and chalk.",
        "colors": {
          "light": [
            "#242424",
            "#626262",
            "#b3b3b3",
            "#e5e5e5"
          ],
          "dark": [
            "#242424",
            "#626262",
            "#b3b3b3",
            "#e5e5e5"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-9"
        }
      },
      {
        "id": "atlas-electric",
        "name": "Electric blue",
        "description": "Vivid blue with candy pink, lime, and inky indigo.",
        "colors": {
          "light": [
            "#5151fc",
            "#ffc0ff",
            "#abff5a",
            "#242866"
          ],
          "dark": [
            "#5151fc",
            "#ffc0ff",
            "#abff5a",
            "#242866"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-9"
        }
      },
      {
        "id": "atlas-open-sky",
        "name": "Open sky",
        "description": "Deep violet with coral, soft lilac, and golden yellow.",
        "colors": {
          "light": [
            "#5100c0",
            "#ff7963",
            "#ceb7f5",
            "#ffd260"
          ],
          "dark": [
            "#5100c0",
            "#ff7963",
            "#ceb7f5",
            "#ffd260"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-9"
        }
      },
      {
        "id": "atlas-lavender",
        "name": "Lavender",
        "description": "Bright lavender with deep plum, butter yellow, and pale mint.",
        "colors": {
          "light": [
            "#a34cf3",
            "#4f206d",
            "#ffed9b",
            "#b6ebd8"
          ],
          "dark": [
            "#a34cf3",
            "#4f206d",
            "#ffed9b",
            "#b6ebd8"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-orchid",
        "name": "Orchid",
        "description": "Electric orchid with deep violet, soft lilac, and lime.",
        "colors": {
          "light": [
            "#e82cf2",
            "#5100c0",
            "#e9d5ff",
            "#abff5a"
          ],
          "dark": [
            "#e82cf2",
            "#5100c0",
            "#e9d5ff",
            "#abff5a"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-futuristic",
        "name": "Futuristic pink",
        "description": "Bright pink balanced by deep green, lavender, and apricot.",
        "colors": {
          "light": [
            "#ff6fff",
            "#085e55",
            "#e9d5ff",
            "#ffce9d"
          ],
          "dark": [
            "#ff6fff",
            "#085e55",
            "#e9d5ff",
            "#ffce9d"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-candy",
        "name": "Candy pink",
        "description": "Soft pink with electric blue, dark berry, and peach.",
        "colors": {
          "light": [
            "#ffc0ff",
            "#5151fc",
            "#79094f",
            "#ffd0b0"
          ],
          "dark": [
            "#ffc0ff",
            "#5151fc",
            "#79094f",
            "#ffd0b0"
          ]
        },
        "primaryForeground": {
          "light": "neutral-9",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-hot-pink",
        "name": "Hot pink",
        "description": "Bold pink with deep green, pale lime, and soft peach.",
        "colors": {
          "light": [
            "#ff2c9c",
            "#085e55",
            "#d4f5a4",
            "#ffd0b0"
          ],
          "dark": [
            "#ff2c9c",
            "#085e55",
            "#d4f5a4",
            "#ffd0b0"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-watermelon",
        "name": "Watermelon",
        "description": "Juicy pink-red with navy, mint, and a pale blush.",
        "colors": {
          "light": [
            "#ff2863",
            "#07376b",
            "#b6ebd8",
            "#ffc5ce"
          ],
          "dark": [
            "#ff2863",
            "#07376b",
            "#b6ebd8",
            "#ffc5ce"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      },
      {
        "id": "atlas-loud",
        "name": "Loud red",
        "description": "A clear red with blush, deep blue, and pale apricot.",
        "colors": {
          "light": [
            "#fc032d",
            "#ffc5ce",
            "#153d85",
            "#ffd7ad"
          ],
          "dark": [
            "#fc032d",
            "#ffc5ce",
            "#153d85",
            "#ffd7ad"
          ]
        },
        "primaryForeground": {
          "light": "neutral-2",
          "dark": "neutral-2"
        }
      }
    ],
    "paletteBaseNeutrals": {
      "light": {
        "neutral-1": "#ffffff",
        "neutral-2": "#fafbfc",
        "neutral-3": "#f2f4f7",
        "neutral-4": "#e4e7eb",
        "neutral-5": "#c8cdd3",
        "neutral-6": "#9ba1aa",
        "neutral-7": "#777e88",
        "neutral-8": "#4f555e",
        "neutral-9": "#2f3339",
        "neutral-10": "#000000"
      },
      "dark": {
        "neutral-1": "#000000",
        "neutral-2": "#1e2024",
        "neutral-3": "#282b30",
        "neutral-4": "#383d44",
        "neutral-5": "#505761",
        "neutral-6": "#7b8490",
        "neutral-7": "#a4acb7",
        "neutral-8": "#c9cfd7",
        "neutral-9": "#f2f4f7",
        "neutral-10": "#ffffff"
      }
    },
    "keyColorPalette": [
      "#ff5a00",
      "#ff9800",
      "#cf9148",
      "#d4b441",
      "#ffea00",
      "#abff5a",
      "#6dcc00",
      "#00c853",
      "#00906c",
      "#085e55",
      "#00b7c4",
      "#00e1f3",
      "#00afe8",
      "#0088ff",
      "#07376b",
      "#242424",
      "#5151fc",
      "#5100c0",
      "#a34cf3",
      "#e82cf2",
      "#ff6fff",
      "#ffc0ff",
      "#ff2c9c",
      "#ff2863",
      "#fc032d"
    ]
  },
  "componentTokens": {
    "button:ghost:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:danger:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "input:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:outline:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:primary:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "select:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:secondary:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "combobox:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "menu:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "slider:default:part:thumb:rest": {
      "controlSize": "l"
    },
    "slider:default:part:track:rest": {
      "controlSize": "xl"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    },
    "combobox:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "menu:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "otp-field:default:part:input:rest": {
      "paddingX": "s",
      "paddingTop": "xs",
      "paddingLeft": "s",
      "paddingRight": "s",
      "paddingBottom": "xs"
    },
    "checkbox:default:part:control:rest": {
      "controlSize": "l"
    },
    "autocomplete:default:part:input:rest": {
      "paddingX": "s",
      "paddingTop": "s",
      "paddingLeft": "s",
      "paddingRight": "s",
      "paddingBottom": "s"
    },
    "autocomplete:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "combobox:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "autocomplete:default:part:popover:rest": {
      "radius": "s"
    },
    "autocomplete:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    }
  },
  "componentVariants": {}
};
