/* ==========================================================================
   Seby TV Home - Main Application Logic, Full Style Engine & LAN Cast Receiver
   Supports:
   - Live real-time UI & CSS customization from PC / Phone Studio
   - Custom floating text widgets with X/Y screen positioning
   - Multi-monitor PC Screen Mirroring (compatible with webOS 4.5 Chromium)
   - LAN Media Cast (Video, Audio, Photos)
   ========================================================================== */

(function () {
  "use strict";

  var ICON_LIBRARY = {
    youtube: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    netflix: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/></svg>',
    spotify: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    livetv: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8a2 2 0 0 0-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/></svg>',
    hdmi: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M18 7V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v3H5v6l3 6v3h8v-3l3-6V7h-1zM8 4h8v3h-2V5h-1v2h-2V5H10v2H8V4zm8.5 8.5l-2.5 5h-4l-2.5-5V9h9v3.5z"/></svg>',
    cast: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>',
    movie: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',
    game: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    web: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path fill="#ffffff" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'
  };

  var DEFAULT_CONFIG = {
    pc_ip: "192.168.1.247",
    pc_port: 8765,
    profile_name: "Seby",
    avatar_letter: "S",
    subtitle_text: "LG 43UM7450PLA \u2022 Custom Home",
    theme: "theme-aurora",
    custom_wallpaper_url: "",
    wallpaper_dim: 0.65,
    weather_city: "București",
    weather_lat: 44.43,
    weather_lon: 26.10,
    show_weather: true,
    show_clock: true,
    show_hero: true,
    show_dock: true,
    show_pc_bar: true,
    ticker_note: "",
    style: {
      bg_primary: "#06080f",
      bg_secondary: "#131b36",
      orb1_color: "#ef4444",
      orb2_color: "#3b82f6",
      orb3_color: "#10b981",
      orb_opacity: 0.42,
      card_radius: 28,
      hero_radius: 30,
      card_height: 295,
      card_gap: 20,
      card_blur: 22,
      card_bg_opacity: 0.07,
      card_border_opacity: 0.14,
      hover_scale: 1.05,
      font_scale: 1.0,
      layout_align: "space-between",
      shell_pad_x: 76,
      shell_pad_y: 42
    },
    custom_texts: [],
    cards: [
      {
        key: "youtube",
        title: "YouTube",
        subtitle: "Videoclipuri, Muzică & Abonamente",
        category: "STREAMING VIDEO",
        heroDesc: "Deschide instant aplicația YouTube de pe televizorul tău LG.",
        appId: "youtube.leanback.v4",
        fallbackIds: ["youtube.leanback.v4", "com.webos.app.youtube"],
        theme: "youtube",
        accentColor: "#ff0033",
        iconBg: "linear-gradient(135deg, #ff0033 0%, #b30024 100%)",
        iconType: "youtube"
      },
      {
        key: "netflix",
        title: "Netflix",
        subtitle: "Filme, Seriale & Originale 4K",
        category: "CINEMA & SERIALE",
        heroDesc: "Continuă vizionarea pe Netflix în 4K HDR cu un singur click.",
        appId: "netflix",
        fallbackIds: ["netflix", "com.webos.app.netflix"],
        theme: "netflix",
        accentColor: "#e50914",
        iconBg: "linear-gradient(135deg, #e50914 0%, #831010 100%)",
        iconType: "netflix"
      },
      {
        key: "spotify",
        title: "Spotify",
        subtitle: "Playlist-uri, Albume & Spotify Connect",
        category: "MUZICĂ & AUDIO",
        heroDesc: "Redă muzica ta preferată prin sistemul audio al televizorului.",
        appId: "spotify-beehive",
        fallbackIds: ["spotify-beehive", "spotify", "com.spotify.tv.client"],
        theme: "spotify",
        accentColor: "#1db954",
        iconBg: "linear-gradient(135deg, #1db954 0%, #117a37 100%)",
        iconType: "spotify"
      },
      {
        key: "livetv",
        title: "Canale TV",
        subtitle: "Televiziune prin Cablu / Antenă Live",
        category: "EMISIE DIRECTĂ",
        heroDesc: "Comută imediat pe posturile TV prin cablu sau antenă (Live TV).",
        appId: "com.webos.app.livetv",
        fallbackIds: ["com.webos.app.livetv"],
        theme: "livetv",
        accentColor: "#3b82f6",
        iconBg: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        iconType: "livetv"
      },
      {
        key: "hdmi1",
        title: "HDMI 1",
        subtitle: "Consolă / Decodor / PC Extern",
        category: "INTRARE VIDEO 1",
        heroDesc: "Comută semnalul video al televizorului direct pe portul HDMI 1.",
        appId: "com.webos.app.hdmi1",
        fallbackIds: ["com.webos.app.hdmi1"],
        theme: "hdmi1",
        accentColor: "#8b5cf6",
        iconBg: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)",
        iconType: "hdmi"
      },
      {
        key: "hdmi2",
        title: "HDMI 2",
        subtitle: "ARC / Dispozitiv Secundar",
        category: "INTRARE VIDEO 2",
        heroDesc: "Comută semnalul video al televizorului direct pe portul HDMI 2 (ARC).",
        appId: "com.webos.app.hdmi2",
        fallbackIds: ["com.webos.app.hdmi2"],
        theme: "hdmi2",
        accentColor: "#06b6d4",
        iconBg: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
        iconType: "hdmi"
      }
    ]
  };

  var SYSTEM_DOCK_ITEMS = [
    {
      title: "PC Screen Mirror",
      meta: "Vezi ecranul PC-ului pe TV",
      action: "mirror-pc-screen",
      svg: '<svg viewBox="0 0 24 24"><path fill="#ef4444" d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>'
    },
    {
      title: "HDMI 3",
      meta: "Intrare Video 3",
      appId: "com.webos.app.hdmi3",
      svg: '<svg viewBox="0 0 24 24"><path fill="#38bdf8" d="M18 7V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v3H5v6l3 6v3h8v-3l3-6V7h-1z"/></svg>'
    },
    {
      title: "Setări TV LG",
      meta: "Imagine, Sunet, Rețea",
      appId: "com.palm.app.settings",
      svg: '<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
    },
    {
      title: "Media Player USB",
      meta: "Foto, Video & Muzică",
      appId: "com.webos.app.photovideo",
      svg: '<svg viewBox="0 0 24 24"><path fill="#a855f7" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 10H9v-2h6v2zm3-4H9v-2h9v2z"/></svg>'
    },
    {
      title: "Browser Web",
      meta: "Navigare Internet",
      appId: "com.webos.app.browser",
      svg: '<svg viewBox="0 0 24 24"><path fill="#10b981" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
    },
    {
      title: "Meniul Original LG",
      meta: "Revino la TV normal",
      action: "classic-mode",
      svg: '<svg viewBox="0 0 24 24"><path fill="#fbbf24" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>'
    }
  ];

  var THEMES = [
    { id: "theme-aurora", label: "Fundal: Aurora" },
    { id: "theme-oled", label: "Fundal: OLED Negru" },
    { id: "theme-sunset", label: "Fundal: Sunset" },
    { id: "theme-cyber", label: "Fundal: Cyber Blue" },
    { id: "theme-emerald", label: "Fundal: Emerald" },
    { id: "theme-custom", label: "Fundal: Custom" }
  ];

  var appConfig = loadSavedConfig();
  var favorites = appConfig.cards || DEFAULT_CONFIG.cards.slice();
  var detectedTvApps = [];
  var isEditingOrder = false;
  var isModalOpen = false;
  var isCastOpen = false;
  var screenMirrorTimer = null;
  var castWebSocket = null;
  var castBlobUrl = null;
  var rtcPeer = null;
  var activeMirrorMonitor = 1;
  var lastEventId = 0;
  var lastConfigHash = "";

  var currentZone = 1;
  var zoneIndices = [0, 0, 0];
  var modalIndex = 0;

  function init() {
    loadEmbeddedUserConfig(function () {
      applyFullConfig(appConfig);
      updateClock();
      setInterval(updateClock, 10000);
      fetchWeather();

      setupMouseAndClickHandlers();
      setupRemoteKeyboardNavigation();
      focusZoneItem(1, 0);

      discoverWebOSApps();
      startPcStudioLiveBridge();
    });
  }

  /* ------------------------------------------------------------------------
     Config & Full CSS Style Engine
     ------------------------------------------------------------------------ */
  function loadSavedConfig() {
    try {
      var raw = localStorage.getItem("seby_full_config_v3");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.cards && parsed.cards.length) {
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  function saveConfigToLocal(cfg) {
    try {
      localStorage.setItem("seby_full_config_v3", JSON.stringify(cfg));
    } catch (e) {}
  }

  function loadEmbeddedUserConfig(cb) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "user_config.json?t=" + new Date().getTime(), true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
            try {
              var diskCfg = JSON.parse(xhr.responseText);
              if (diskCfg && diskCfg.cards && diskCfg.cards.length) {
                appConfig = diskCfg;
                favorites = diskCfg.cards;
                saveConfigToLocal(appConfig);
              }
            } catch (e) {}
          }
          if (cb) cb();
        }
      };
      xhr.send();
    } catch (e) {
      if (cb) cb();
    }
  }

  function applyStyleVariables(st) {
    st = st || {};
    var root = document.documentElement;
    root.style.setProperty("--tv-bg-primary", st.bg_primary || "#06080f");
    root.style.setProperty("--tv-bg-secondary", st.bg_secondary || "#131b36");
    root.style.setProperty("--tv-card-radius", (st.card_radius !== undefined ? st.card_radius : 28) + "px");
    root.style.setProperty("--tv-hero-radius", (st.hero_radius !== undefined ? st.hero_radius : 30) + "px");
    root.style.setProperty("--tv-card-height", (st.card_height !== undefined ? st.card_height : 295) + "px");
    root.style.setProperty("--tv-card-gap", (st.card_gap !== undefined ? st.card_gap : 20) + "px");
    root.style.setProperty("--tv-card-blur", (st.card_blur !== undefined ? st.card_blur : 22) + "px");
    root.style.setProperty("--tv-card-bg", "rgba(255, 255, 255, " + (st.card_bg_opacity !== undefined ? st.card_bg_opacity : 0.07) + ")");
    root.style.setProperty("--tv-card-border", "rgba(255, 255, 255, " + (st.card_border_opacity !== undefined ? st.card_border_opacity : 0.14) + ")");
    root.style.setProperty("--tv-hover-scale", String(st.hover_scale !== undefined ? st.hover_scale : 1.05));
    root.style.setProperty("--tv-font-scale", String(st.font_scale !== undefined ? st.font_scale : 1.0));
    root.style.setProperty("--tv-shell-padx", (st.shell_pad_x !== undefined ? st.shell_pad_x : 76) + "px");
    root.style.setProperty("--tv-shell-pady", (st.shell_pad_y !== undefined ? st.shell_pad_y : 42) + "px");
    root.style.setProperty("--tv-orb-opacity", String(st.orb_opacity !== undefined ? st.orb_opacity : 0.42));

    var orb1 = document.getElementById("orb1");
    var orb2 = document.getElementById("orb2");
    var orb3 = document.getElementById("orb3");
    if (orb1 && st.orb1_color) orb1.style.background = "radial-gradient(circle, " + st.orb1_color + " 0%, transparent 70%)";
    if (orb2 && st.orb2_color) orb2.style.background = "radial-gradient(circle, " + st.orb2_color + " 0%, transparent 70%)";
    if (orb3 && st.orb3_color) orb3.style.background = "radial-gradient(circle, " + st.orb3_color + " 0%, transparent 70%)";

    var shell = document.getElementById("appShell");
    if (shell && st.layout_align) {
      shell.style.justifyContent = st.layout_align;
    }
  }

  function renderCustomFloatingTexts(textsList) {
    var layer = document.getElementById("customTextsLayer");
    if (!layer) return;
    layer.innerHTML = "";
    if (!textsList || !textsList.length) return;

    for (var i = 0; i < textsList.length; i++) {
      var t = textsList[i];
      if (!t || !t.text) continue;
      var div = document.createElement("div");
      div.className = "custom-floating-text";
      div.textContent = t.text;
      div.style.left = (t.x !== undefined ? t.x : 50) + "%";
      div.style.top = (t.y !== undefined ? t.y : 12) + "%";
      div.style.transform = "translate(-50%, -50%)";
      div.style.fontSize = (t.size || 24) + "px";
      div.style.color = t.color || "#ffffff";
      div.style.background = t.bg || "rgba(15, 23, 42, 0.72)";
      div.style.border = t.bg === "transparent" ? "none" : "1px solid rgba(255,255,255,0.18)";
      layer.appendChild(div);
    }
  }

  function applyFullConfig(cfg) {
    if (!cfg) return;
    appConfig = cfg;
    if (cfg.cards && cfg.cards.length) {
      favorites = cfg.cards;
    }

    applyStyleVariables(cfg.style || {});
    renderCustomFloatingTexts(cfg.custom_texts || []);

    var av = document.getElementById("avatarBadge");
    if (av) av.textContent = cfg.avatar_letter || "S";
    var meta = document.getElementById("deviceMetaText");
    if (meta) meta.textContent = cfg.subtitle_text || "LG 43UM7450PLA \u2022 Custom Home";

    var ticker = document.getElementById("tickerNoteBox");
    if (ticker) {
      if (cfg.ticker_note && cfg.ticker_note.trim()) {
        ticker.textContent = "\uD83D\uDCCC " + cfg.ticker_note;
        ticker.classList.remove("hidden");
      } else {
        ticker.classList.add("hidden");
      }
    }

    var wEl = document.getElementById("weatherWidget");
    if (wEl) wEl.style.display = cfg.show_weather === false ? "none" : "block";
    var cEl = document.getElementById("clockWidget");
    if (cEl) cEl.style.display = cfg.show_clock === false ? "none" : "block";
    var hEl = document.getElementById("heroBanner");
    if (hEl) hEl.style.display = cfg.show_hero === false ? "none" : "flex";
    var dEl = document.getElementById("dockSection");
    if (dEl) dEl.style.display = cfg.show_dock === false ? "none" : "flex";

    var wCity = document.getElementById("weatherDesc");
    if (wCity && cfg.weather_city) wCity.textContent = cfg.weather_city;

    var themeId = cfg.theme || "theme-aurora";
    document.body.className = themeId + (isEditingOrder ? " editing-order" : "");
    for (var t = 0; t < THEMES.length; t++) {
      if (THEMES[t].id === themeId) {
        var lbl = document.getElementById("themeBtnLabel");
        if (lbl) lbl.textContent = THEMES[t].label;
        break;
      }
    }

    var wpLayer = document.getElementById("wallpaperLayer");
    if (wpLayer) {
      if (cfg.custom_wallpaper_url && cfg.custom_wallpaper_url.trim()) {
        var wpUrl = cfg.custom_wallpaper_url.trim();
        if (wpUrl.indexOf("http") !== 0 && wpUrl.indexOf("data:") !== 0) {
          wpUrl = getPcBaseUrl() + wpUrl;
        }
        wpLayer.style.backgroundImage = "url('" + wpUrl + "')";
        wpLayer.style.opacity = String(1 - (cfg.wallpaper_dim !== undefined ? cfg.wallpaper_dim : 0.6));
      } else {
        wpLayer.style.backgroundImage = "none";
        wpLayer.style.opacity = "0";
      }
    }

    updateClock();
    renderMainCards();
    renderDock();

    if (currentZone === 1) {
      if (zoneIndices[1] >= favorites.length) zoneIndices[1] = 0;
      focusZoneItem(1, zoneIndices[1]);
    }
  }

  /* ------------------------------------------------------------------------
     PC Studio Live Bridge
     ------------------------------------------------------------------------ */
  function getPcBaseUrl() {
    var ip = (appConfig && appConfig.pc_ip) ? appConfig.pc_ip : "192.168.1.247";
    var port = (appConfig && appConfig.pc_port) ? appConfig.pc_port : 8765;
    if (window.location.hostname && window.location.hostname !== "" && window.location.protocol.indexOf("http") === 0) {
      return window.location.protocol + "//" + window.location.hostname + ":" + port;
    }
    return "http://" + ip + ":" + port;
  }

  function startPcStudioLiveBridge() {
    pollPcStudio();
    setInterval(pollPcStudio, 1400);
  }

  function pollPcStudio() {
    var url = getPcBaseUrl() + "/api/tv/poll?since=" + lastEventId + "&t=" + new Date().getTime();
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 1200;
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          var dot = document.getElementById("pcBridgeDot");
          var statusTxt = document.getElementById("pcBridgeStatus");

          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              if (dot) {
                dot.style.background = "#10b981";
                dot.style.boxShadow = "0 0 12px #10b981";
              }
              if (statusTxt && data.pc_stats) {
                statusTxt.textContent = "PC & Phone Studio Live (" + data.pc_stats + ")";
              }

              if (data.config_hash && data.config_hash !== lastConfigHash) {
                lastConfigHash = data.config_hash;
                if (data.config) {
                  saveConfigToLocal(data.config);
                  applyFullConfig(data.config);
                }
              }

              if (data.events && data.events.length) {
                for (var i = 0; i < data.events.length; i++) {
                  var ev = data.events[i];
                  if (ev.id > lastEventId) {
                    lastEventId = ev.id;
                    handlePcRemoteEvent(ev);
                  }
                }
              }
            } catch (e) {}
          } else {
            if (dot) {
              dot.style.background = "#64748b";
              dot.style.boxShadow = "none";
            }
            if (statusTxt) {
              statusTxt.textContent = "Mod Autonom TV (pornește Seby TV Studio pe PC pentru Cast & Live Edit)";
            }
          }
        }
      };
      xhr.send();
    } catch (e) {}
  }

  function handlePcRemoteEvent(ev) {
    if (!ev || !ev.type) return;

    if (ev.type === "toast") {
      showToast(ev.message || "Mesaj de pe PC");
    } else if (ev.type === "launch_app") {
      launchWebOSAppId(ev.appId, ev.title || ev.appId, [ev.appId], 0);
    } else if (ev.type === "cast_media") {
      startCastPlayback(ev.mediaType, ev.url, ev.title, ev.monitorIndex);
    } else if (ev.type === "cast_control") {
      controlActiveCast(ev.action, ev.value);
    } else if (ev.type === "stop_cast") {
      stopCastPlayback();
    } else if (ev.type === "remote_key") {
      simulateRemoteAction(ev.key);
    }
  }

  /* ------------------------------------------------------------------------
     LAN Cast Receiver (Multi-Monitor Screen Mirroring + Video/Audio/Photo)
     Uses double-buffered JPEG polling for Screen Mirroring so webOS 4.5
     Chromium renders 100% smoothly without black screen!
     ------------------------------------------------------------------------ */
  function startCastPlayback(mediaType, rawUrl, title, monitorIdx) {
    var overlay = document.getElementById("castOverlay");
    var titleEl = document.getElementById("castMediaTitle");
    var videoEl = document.getElementById("castVideoPlayer");
    var imgEl = document.getElementById("castImageViewer");
    var iframeEl = document.getElementById("castIframeViewer");

    if (!overlay || !videoEl || !imgEl || !iframeEl) return;

    if (screenMirrorTimer) {
      clearTimeout(screenMirrorTimer);
      screenMirrorTimer = null;
    }

    var fullUrl = rawUrl || "";
    if (fullUrl.indexOf("http") !== 0 && fullUrl.indexOf("data:") !== 0) {
      fullUrl = getPcBaseUrl() + fullUrl;
    }

    try {
      videoEl.pause();
      videoEl.removeAttribute("src");
    } catch (e) {}
    imgEl.removeAttribute("src");
    iframeEl.removeAttribute("src");

    videoEl.classList.add("hidden");
    imgEl.classList.add("hidden");
    iframeEl.classList.add("hidden");

    if (titleEl) titleEl.textContent = title || "Cast de pe PC";
    overlay.classList.remove("hidden");
    isCastOpen = true;

    if (mediaType === "screen_mirror") {
      activeMirrorMonitor = (monitorIdx !== undefined && monitorIdx !== null) ? monitorIdx : 1;
      imgEl.classList.remove("hidden");
      showToast("Conectare 60 FPS Hardware Stream...");
      startTurboWebSocketMirror(imgEl, videoEl);
      return;
    }

    if (mediaType === "video" || mediaType === "audio") {
      videoEl.classList.remove("hidden");
      videoEl.src = fullUrl;
      videoEl.load();
      var playPromise = videoEl.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          showToast("Apasă OK pe telecomandă pentru a porni redarea");
        });
      }
      showToast("Redare Cast de pe PC: " + (title || "Video"));
    } else if (mediaType === "image") {
      imgEl.classList.remove("hidden");
      imgEl.src = fullUrl;
      showToast("Imagine Cast: " + (title || ""));
    } else if (mediaType === "web" || mediaType === "youtube_embed") {
      iframeEl.classList.remove("hidden");
      iframeEl.src = fullUrl;
      showToast("Cast Web: " + (title || ""));
    }
  }

  function startTurboWebSocketMirror(imgEl, videoEl) {
    closeCastWebSocket();
    var ip = (appConfig && appConfig.pc_ip) ? appConfig.pc_ip : "192.168.1.247";
    var port = ((appConfig && appConfig.pc_port) ? parseInt(appConfig.pc_port, 10) : 8765) + 1;
    if (window.location.hostname && window.location.hostname !== "" && window.location.protocol.indexOf("http") === 0) {
      ip = window.location.hostname;
    }
    var wsUrl = "ws://" + ip + ":" + port;
    var wsReceivedFrames = false;
    var webrtcActive = false;

    if (typeof window.WebSocket !== "undefined") {
      try {
        castWebSocket = new window.WebSocket(wsUrl);
        castWebSocket.binaryType = "blob";

        castWebSocket.onopen = function () {
          // Announce to PC Studio that TV Receiver is ready for 60 FPS WebRTC Offer
          try {
            castWebSocket.send(JSON.stringify({ type: "webrtc_viewer_ready" }));
          } catch (e) {}
        };

        castWebSocket.onmessage = function (evt) {
          if (!isCastOpen || !evt.data) return;

          // 1. Handle WebRTC 60 FPS Hardware Video Signaling (JSON string)
          if (typeof evt.data === "string") {
            try {
              var sig = JSON.parse(evt.data);
              handleWebRTCSignalingOnTv(sig, videoEl, imgEl, function () {
                webrtcActive = true;
                wsReceivedFrames = true;
                if (screenMirrorTimer) {
                  clearTimeout(screenMirrorTimer);
                  screenMirrorTimer = null;
                }
              });
            } catch (e) {}
            return;
          }

          // 2. If WebRTC is already playing 60FPS hardware video, ignore fallback JPEG blobs
          if (webrtcActive) return;

          // 3. Fallback Binary JPEG Stream
          wsReceivedFrames = true;
          if (screenMirrorTimer) {
            clearTimeout(screenMirrorTimer);
            screenMirrorTimer = null;
          }
          if (typeof window.URL !== "undefined" && window.URL.createObjectURL) {
            var nextUrl = window.URL.createObjectURL(evt.data);
            imgEl.src = nextUrl;
            if (castBlobUrl) {
              try { window.URL.revokeObjectURL(castBlobUrl); } catch (e) {}
            }
            castBlobUrl = nextUrl;
          }
        };

        castWebSocket.onerror = function () {
          if (!wsReceivedFrames && isCastOpen) {
            pumpScreenMirrorFrame(imgEl);
          }
        };

        castWebSocket.onclose = function () {
          if (isCastOpen && !screenMirrorTimer && !webrtcActive) {
            pumpScreenMirrorFrame(imgEl);
          }
        };
      } catch (e) {
        pumpScreenMirrorFrame(imgEl);
      }
    }

    screenMirrorTimer = setTimeout(function () {
      if (!wsReceivedFrames && !webrtcActive && isCastOpen) {
        pumpScreenMirrorFrame(imgEl);
      }
    }, 900);
  }

  function handleWebRTCSignalingOnTv(sig, videoEl, imgEl, onStreamStarted) {
    var RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCSession = window.RTCSessionDescription || window.webkitRTCSessionDescription;
    var RTCIce = window.RTCIceCandidate || window.webkitRTCIceCandidate;
    if (!RTCPeer) return;

    if (sig.type === "webrtc_offer" && sig.sdp) {
      if (rtcPeer) {
        try { rtcPeer.close(); } catch (e) {}
      }
      rtcPeer = new RTCPeer({ iceServers: [] });

      rtcPeer.onicecandidate = function (event) {
        if (event.candidate && castWebSocket && castWebSocket.readyState === 1) {
          castWebSocket.send(JSON.stringify({
            type: "webrtc_ice_viewer",
            candidate: event.candidate
          }));
        }
      };

      var attachStream = function (stream) {
        if (!videoEl) return;
        imgEl.classList.add("hidden");
        videoEl.classList.remove("hidden");
        videoEl.muted = false;
        videoEl.playsInline = true;
        try {
          videoEl.srcObject = stream;
        } catch (e) {
          if (window.URL && window.URL.createObjectURL) {
            videoEl.src = window.URL.createObjectURL(stream);
          }
        }
        var p = videoEl.play();
        if (p && p.catch) {
          p.catch(function () {
            videoEl.muted = true;
            videoEl.play();
          });
        }
        if (onStreamStarted) onStreamStarted();
        showToast("60 FPS Hardware WebRTC Activ!");
      };

      rtcPeer.ontrack = function (event) {
        if (event.streams && event.streams[0]) {
          attachStream(event.streams[0]);
        }
      };
      rtcPeer.onaddstream = function (event) {
        if (event.stream) {
          attachStream(event.stream);
        }
      };

      var desc = RTCSession ? new RTCSession(sig.sdp) : sig.sdp;
      rtcPeer.setRemoteDescription(desc, function () {
        rtcPeer.createAnswer(function (answer) {
          rtcPeer.setLocalDescription(answer, function () {
            if (castWebSocket && castWebSocket.readyState === 1) {
              castWebSocket.send(JSON.stringify({
                type: "webrtc_answer",
                sdp: rtcPeer.localDescription || answer
              }));
            }
          }, function () {});
        }, function () {});
      }, function () {});
    } else if (sig.type === "webrtc_ice_sender" && sig.candidate && rtcPeer) {
      try {
        var cand = RTCIce ? new RTCIce(sig.candidate) : sig.candidate;
        rtcPeer.addIceCandidate(cand, function () {}, function () {});
      } catch (e) {}
    }
  }

  function closeCastWebSocket() {
    if (rtcPeer) {
      try { rtcPeer.close(); } catch (e) {}
      rtcPeer = null;
    }
    if (castWebSocket) {
      try { castWebSocket.close(); } catch (e) {}
      castWebSocket = null;
    }
    if (castBlobUrl && typeof window.URL !== "undefined") {
      try { window.URL.revokeObjectURL(castBlobUrl); } catch (e) {}
      castBlobUrl = null;
    }
  }

  function pumpScreenMirrorFrame(imgEl) {
    if (!isCastOpen) return;
    var frameUrl = getPcBaseUrl() + "/api/cast/screen.jpg?monitor=" + activeMirrorMonitor + "&t=" + new Date().getTime();
    var preloader = new Image();
    preloader.onload = function () {
      if (!isCastOpen) return;
      imgEl.src = frameUrl;
      screenMirrorTimer = setTimeout(function () {
        pumpScreenMirrorFrame(imgEl);
      }, 45);
    };
    preloader.onerror = function () {
      if (!isCastOpen) return;
      screenMirrorTimer = setTimeout(function () {
        pumpScreenMirrorFrame(imgEl);
      }, 300);
    };
    preloader.src = frameUrl;
  }

  function controlActiveCast(action, val) {
    if (action === "switch_monitor") {
      activeMirrorMonitor = val || 1;
      var titleEl = document.getElementById("castMediaTitle");
      if (titleEl) titleEl.textContent = "Ecran PC Live (Monitor " + activeMirrorMonitor + ")";
      showToast("Comutat pe Monitorul " + activeMirrorMonitor);
      return;
    }

    var videoEl = document.getElementById("castVideoPlayer");
    if (!videoEl || videoEl.classList.contains("hidden")) return;

    if (action === "toggle_play") {
      if (videoEl.paused) videoEl.play();
      else videoEl.pause();
    } else if (action === "pause") {
      videoEl.pause();
    } else if (action === "play") {
      videoEl.play();
    } else if (action === "seek_rel") {
      videoEl.currentTime = Math.max(0, (videoEl.currentTime || 0) + (val || 15));
    } else if (action === "seek_abs") {
      videoEl.currentTime = val || 0;
    } else if (action === "volume") {
      videoEl.volume = Math.max(0, Math.min(1, val));
    }
  }

  function stopCastPlayback() {
    closeCastWebSocket();
    if (screenMirrorTimer) {
      clearTimeout(screenMirrorTimer);
      screenMirrorTimer = null;
    }
    var overlay = document.getElementById("castOverlay");
    var videoEl = document.getElementById("castVideoPlayer");
    var imgEl = document.getElementById("castImageViewer");
    var iframeEl = document.getElementById("castIframeViewer");

    if (videoEl) {
      try {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
      } catch (e) {}
    }
    if (imgEl) imgEl.removeAttribute("src");
    if (iframeEl) iframeEl.removeAttribute("src");
    if (overlay) overlay.classList.add("hidden");

    isCastOpen = false;
    focusZoneItem(currentZone, zoneIndices[currentZone]);
  }

  /* ------------------------------------------------------------------------
     Rendering Main Cards & Dock
     ------------------------------------------------------------------------ */
  function getCardSvg(item) {
    if (item.svg) return item.svg;
    if (item.iconType && ICON_LIBRARY[item.iconType]) {
      return ICON_LIBRARY[item.iconType];
    }
    return ICON_LIBRARY.star;
  }

  function renderMainCards() {
    var grid = document.getElementById("mainCardsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    for (var i = 0; i < favorites.length; i++) {
      var item = favorites[i];
      var card = document.createElement("div");
      card.className = "app-card focusable-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("data-index", String(i));
      card.setAttribute("data-key", item.key || ("card_" + i));

      var accent = item.accentColor || "#0ea5e9";
      var iconBg = item.iconBg || ("linear-gradient(135deg, " + accent + " 0%, #1e293b 100%)");

      card.innerHTML =
        '<div class="app-card-glow" style="background: radial-gradient(circle at 80% 15%, ' + accent + ' 0%, transparent 70%);"></div>' +
        '<div class="card-top">' +
          '<div class="card-icon-wrap" style="background:' + iconBg + '">' +
            getCardSvg(item) +
          '</div>' +
          '<div class="card-shortcut">TASTA ' + (i + 1) + '</div>' +
        '</div>' +
        '<div class="card-bottom">' +
          '<div class="card-category">' + (item.category || "APLICAȚIE") + '</div>' +
          '<div class="card-title">' + (item.title || "Card") + '</div>' +
          '<div class="card-subtitle">' + (item.subtitle || "") + '</div>' +
          '<div class="edit-mode-arrows">&larr; Săgeți Stânga / Dreapta &rarr;</div>' +
        '</div>';

      (function (index, favItem, cardEl) {
        cardEl.addEventListener("mouseenter", function () {
          currentZone = 1;
          zoneIndices[1] = index;
          highlightFocusedElement(cardEl);
          updateHeroPreview(favItem, index);
        });
        cardEl.addEventListener("click", function () {
          if (isEditingOrder) {
            toggleEditOrderMode();
          } else {
            launchFavoriteItem(favItem);
          }
        });
      })(i, item, card);

      grid.appendChild(card);
    }
  }

  function renderDock() {
    var row = document.getElementById("secondaryDockRow");
    if (!row) return;
    row.innerHTML = "";

    var combined = [];
    combined.push(SYSTEM_DOCK_ITEMS[0]);

    var mainIds = {};
    for (var m = 0; m < favorites.length; m++) {
      mainIds[favorites[m].appId] = true;
      var fb = favorites[m].fallbackIds || [];
      for (var f = 0; f < fb.length; f++) {
        mainIds[fb[f]] = true;
      }
    }

    for (var a = 0; a < detectedTvApps.length; a++) {
      var tvApp = detectedTvApps[a];
      if (!mainIds[tvApp.id] && tvApp.id !== "com.seby.customhome") {
        combined.push({
          title: tvApp.title || tvApp.id,
          meta: "Aplicație instalată pe TV",
          appId: tvApp.id,
          iconUrl: tvApp.icon
        });
      }
    }

    for (var s = 1; s < SYSTEM_DOCK_ITEMS.length; s++) {
      combined.push(SYSTEM_DOCK_ITEMS[s]);
    }

    for (var i = 0; i < combined.length; i++) {
      var dItem = combined[i];
      var el = document.createElement("div");
      el.className = "dock-item focusable-dock";
      el.setAttribute("tabindex", "0");
      el.setAttribute("data-dock-index", String(i));

      var iconHtml = dItem.iconUrl
        ? '<img src="' + dItem.iconUrl + '" alt="" onerror="this.style.display=\'none\'" />'
        : (dItem.svg || ICON_LIBRARY.star);

      el.innerHTML =
        '<div class="dock-icon">' + iconHtml + '</div>' +
        '<div class="dock-info">' +
          '<div class="dock-title">' + dItem.title + '</div>' +
          '<div class="dock-meta">' + dItem.meta + '</div>' +
        '</div>';

      (function (idx, itemObj, domEl) {
        domEl.addEventListener("mouseenter", function () {
          currentZone = 2;
          zoneIndices[2] = idx;
          highlightFocusedElement(domEl);
        });
        domEl.addEventListener("click", function () {
          activateDockItem(itemObj);
        });
      })(i, dItem, el);

      row.appendChild(el);
    }
  }

  function updateHeroPreview(favItem, index) {
    if (!favItem) return;
    var tag = document.getElementById("heroTag");
    var title = document.getElementById("heroTitle");
    var desc = document.getElementById("heroDesc");
    var keyCap = document.getElementById("heroKeyCap");
    var orb1 = document.getElementById("orb1");

    if (tag) tag.textContent = (favItem.category || "ACCES RAPID") + " \u2022 TASTA " + (index + 1);
    if (title) title.textContent = favItem.title || "";
    if (desc) desc.textContent = favItem.heroDesc || favItem.subtitle || "";
    if (keyCap) keyCap.textContent = "OK / " + (index + 1);

    if (orb1 && favItem.accentColor && (!appConfig.style || !appConfig.style.orb1_color)) {
      orb1.style.background = "radial-gradient(circle, " + favItem.accentColor + " 0%, transparent 70%)";
    }
  }

  /* ------------------------------------------------------------------------
     webOS Luna Service Calls
     ------------------------------------------------------------------------ */
  function callLunaService(uri, method, parameters, onSuccess, onFailure) {
    var fullUri = uri + (method ? "/" + method : "");

    if (typeof window.PalmServiceBridge !== "undefined") {
      try {
        var bridge = new window.PalmServiceBridge();
        bridge.onservicecallback = function (msg) {
          try {
            var res = JSON.parse(msg);
            if (res.returnValue === false) {
              if (onFailure) onFailure(res);
            } else {
              if (onSuccess) onSuccess(res);
            }
          } catch (err) {
            if (onFailure) onFailure(err);
          }
        };
        bridge.call(fullUri, JSON.stringify(parameters || {}));
        return true;
      } catch (e) {
        if (onFailure) onFailure(e);
      }
    }

    if (typeof window.webOS !== "undefined" && window.webOS.service) {
      window.webOS.service.request(uri, {
        method: method,
        parameters: parameters || {},
        onSuccess: onSuccess || function () {},
        onFailure: onFailure || function () {}
      });
      return true;
    }

    return false;
  }

  function discoverWebOSApps() {
    var statusEl = document.getElementById("tvStatusIndicator");

    callLunaService(
      "luna://com.webos.applicationManager",
      "listLaunchPoints",
      {},
      function (res) {
        if (res && res.launchPoints && res.launchPoints.length) {
          detectedTvApps = [];
          for (var i = 0; i < res.launchPoints.length; i++) {
            var lp = res.launchPoints[i];
            detectedTvApps.push({
              id: lp.id,
              title: lp.title,
              icon: lp.icon || lp.miniicon
            });
            matchInstalledFavoriteId(lp.id, lp.title);
          }
          if (statusEl) {
            statusEl.textContent = detectedTvApps.length + " aplicații găsite pe TV-ul tău LG";
          }
          renderDock();
        }
      },
      function () {
        if (statusEl) {
          statusEl.textContent = "Scurtături rapide webOS & PC Cast";
        }
      }
    );
  }

  function matchInstalledFavoriteId(installedId, installedTitle) {
    if (!installedId) return;
    var lowerId = installedId.toLowerCase();
    var lowerTitle = (installedTitle || "").toLowerCase();

    for (var i = 0; i < favorites.length; i++) {
      var fav = favorites[i];
      if (fav.key === "youtube" && (lowerId.indexOf("youtube") !== -1 || lowerTitle.indexOf("youtube") !== -1)) {
        fav.appId = installedId;
      } else if (fav.key === "netflix" && (lowerId.indexOf("netflix") !== -1 || lowerTitle.indexOf("netflix") !== -1)) {
        fav.appId = installedId;
      } else if (fav.key === "spotify" && (lowerId.indexOf("spotify") !== -1 || lowerTitle.indexOf("spotify") !== -1)) {
        fav.appId = installedId;
      }
    }
  }

  function launchWebOSAppId(appId, title, fallbackList, indexInFallback) {
    if (appId === "pc.screen.mirror") {
      startCastPlayback("screen_mirror", "", "Ecran PC Live (Monitor 1)", 1);
      return;
    }
    if (appId && (appId.indexOf("http://") === 0 || appId.indexOf("https://") === 0)) {
      callLunaService("luna://com.webos.applicationManager", "launch", {
        id: "com.webos.app.browser",
        params: { target: appId }
      });
      return;
    }

    var idx = indexInFallback || 0;
    showToast("Se deschide " + (title || appId) + "...");

    var sent = callLunaService(
      "luna://com.webos.applicationManager",
      "launch",
      { id: appId },
      function () {},
      function () {
        if (fallbackList && idx + 1 < fallbackList.length) {
          launchWebOSAppId(fallbackList[idx + 1], title, fallbackList, idx + 1);
        } else {
          showToast("Nu s-a putut deschide " + title + " (" + appId + ")");
        }
      }
    );

    if (!sent) {
      showToast("[Previzualizare] Lansare: " + title + " (" + appId + ")");
    }
  }

  function launchFavoriteItem(favItem) {
    launchWebOSAppId(favItem.appId, favItem.title, favItem.fallbackIds || [favItem.appId], 0);
  }

  function activateDockItem(itemObj) {
    if (itemObj.action === "classic-mode") {
      openClassicModal();
      return;
    }
    if (itemObj.action === "mirror-pc-screen") {
      startCastPlayback("screen_mirror", "", "Ecran PC Live (Monitor 1)", 1);
      return;
    }
    if (itemObj.appId) {
      launchWebOSAppId(itemObj.appId, itemObj.title, [itemObj.appId], 0);
    }
  }

  /* ------------------------------------------------------------------------
     Clock & Weather
     ------------------------------------------------------------------------ */
  function updateClock() {
    var now = new Date();
    var hours = String(now.getHours());
    var mins = String(now.getMinutes());
    if (hours.length < 2) hours = "0" + hours;
    if (mins.length < 2) mins = "0" + mins;

    var timeEl = document.getElementById("clockTime");
    if (timeEl) timeEl.textContent = hours + ":" + mins;

    var days = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
    var months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
    var dateEl = document.getElementById("clockDate");
    if (dateEl) {
      dateEl.textContent = days[now.getDay()] + ", " + now.getDate() + " " + months[now.getMonth()];
    }

    var greetEl = document.getElementById("greetingText");
    if (greetEl) {
      var h = now.getHours();
      var name = (appConfig && appConfig.profile_name) ? appConfig.profile_name : "Seby";
      var salut = h < 12 ? "Bună dimineața, " : (h < 18 ? "Bună ziua, " : "Bună seara, ");
      greetEl.textContent = salut + name;
    }
  }

  function fetchWeather() {
    var lat = (appConfig && appConfig.weather_lat) ? appConfig.weather_lat : 44.43;
    var lon = (appConfig && appConfig.weather_lon) ? appConfig.weather_lon : 26.10;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true", true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.current_weather) {
              var temp = Math.round(data.current_weather.temperature);
              var tempEl = document.getElementById("weatherTemp");
              if (tempEl) tempEl.textContent = temp + "°C";
            }
          } catch (e) {}
        }
      };
      xhr.send();
    } catch (e) {}
  }

  /* ------------------------------------------------------------------------
     Top Bar Actions & Modal
     ------------------------------------------------------------------------ */
  function toggleEditOrderMode() {
    isEditingOrder = !isEditingOrder;
    var btn = document.getElementById("btnEditOrder");
    var lbl = document.getElementById("editBtnLabel");
    var hint = document.getElementById("editHintText");

    if (isEditingOrder) {
      document.body.classList.add("editing-order");
      if (btn) btn.classList.add("active-edit");
      if (lbl) lbl.textContent = "Salvează Ordinea";
      if (hint) hint.textContent = "MOD ARANJARE ACTIV: Folosește Săgețile Stânga/Dreapta pentru a muta cardul selectat, apoi apasă OK!";
      showToast("Mod Aranjare: Mută cardul cu Stânga/Dreapta și apasă OK pentru a salva");
      focusZoneItem(1, zoneIndices[1]);
    } else {
      document.body.classList.remove("editing-order");
      if (btn) btn.classList.remove("active-edit");
      if (lbl) lbl.textContent = "Aranjează Carduri";
      if (hint) hint.textContent = "Folosește săgețile, rotița Magic Remote sau tastele 1-6";
      appConfig.cards = favorites;
      saveConfigToLocal(appConfig);
      showToast("Ordinea aplicațiilor a fost salvată!");
    }
  }

  function cycleTheme() {
    var cur = appConfig.theme || "theme-aurora";
    var nextIdx = 0;
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === cur) {
        nextIdx = (i + 1) % THEMES.length;
        break;
      }
    }
    appConfig.theme = THEMES[nextIdx].id;
    saveConfigToLocal(appConfig);
    applyFullConfig(appConfig);
  }

  function openClassicModal() {
    isModalOpen = true;
    var modal = document.getElementById("classicModal");
    if (modal) modal.classList.remove("hidden");
    modalIndex = 0;
    focusModalButton(modalIndex);
  }

  function closeClassicModal() {
    isModalOpen = false;
    var modal = document.getElementById("classicModal");
    if (modal) modal.classList.add("hidden");
    focusZoneItem(currentZone, zoneIndices[currentZone]);
  }

  function handleModalAction(action) {
    if (action === "exit-to-tv") {
      closeClassicModal();
      launchWebOSAppId("com.webos.app.livetv", "Canale TV Live", ["com.webos.app.livetv"], 0);
      setTimeout(function () {
        if (typeof window.close === "function") window.close();
      }, 600);
    } else if (action === "open-lg-settings") {
      closeClassicModal();
      launchWebOSAppId("com.palm.app.settings", "Setări TV LG", ["com.palm.app.settings"], 0);
    } else {
      closeClassicModal();
    }
  }

  function setupMouseAndClickHandlers() {
    var topBtns = document.querySelectorAll(".topbar .pill-btn");
    for (var i = 0; i < topBtns.length; i++) {
      (function (idx, btn) {
        btn.addEventListener("mouseenter", function () {
          currentZone = 0;
          zoneIndices[0] = idx;
          highlightFocusedElement(btn);
        });
        btn.addEventListener("click", function () {
          var act = btn.getAttribute("data-action");
          if (act === "toggle-edit") toggleEditOrderMode();
          else if (act === "cycle-theme") cycleTheme();
          else if (act === "classic-mode") openClassicModal();
          else if (act === "open-cast-hub") {
            startCastPlayback("screen_mirror", "", "Ecran PC Live (Monitor 1)", 1);
          }
        });
      })(i, topBtns[i]);
    }

    var closeCastBtn = document.getElementById("btnCloseCast");
    if (closeCastBtn) {
      closeCastBtn.addEventListener("click", function () {
        stopCastPlayback();
      });
    }

    var modalBtns = document.querySelectorAll(".focusable-modal");
    for (var m = 0; m < modalBtns.length; m++) {
      (function (mIdx, mBtn) {
        mBtn.addEventListener("mouseenter", function () {
          modalIndex = mIdx;
          focusModalButton(mIdx);
        });
        mBtn.addEventListener("click", function () {
          handleModalAction(mBtn.getAttribute("data-modal-action"));
        });
      })(m, modalBtns[m]);
    }
  }

  /* ------------------------------------------------------------------------
     D-Pad & Magic Remote Navigation
     ------------------------------------------------------------------------ */
  function getZoneElements(zone) {
    if (zone === 0) return document.querySelectorAll(".topbar .pill-btn");
    if (zone === 1) return document.querySelectorAll(".focusable-card");
    if (zone === 2) return document.querySelectorAll(".focusable-dock");
    return [];
  }

  function highlightFocusedElement(targetEl) {
    var all = document.querySelectorAll(".focused");
    for (var i = 0; i < all.length; i++) {
      all[i].classList.remove("focused");
    }
    if (targetEl) {
      targetEl.classList.add("focused");
      try {
        targetEl.focus();
      } catch (e) {}
    }
  }

  function focusZoneItem(zone, index) {
    currentZone = zone;
    var items = getZoneElements(zone);
    if (!items || !items.length) return;

    if (index < 0) index = 0;
    if (index >= items.length) index = items.length - 1;
    zoneIndices[zone] = index;

    var el = items[index];
    highlightFocusedElement(el);

    if (zone === 1 && favorites[index]) {
      updateHeroPreview(favorites[index], index);
    } else if (zone === 2 && el && el.scrollIntoView) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } catch (e) {}
    }
  }

  function focusModalButton(idx) {
    var btns = document.querySelectorAll(".focusable-modal");
    if (!btns.length) return;
    if (idx < 0) idx = 0;
    if (idx >= btns.length) idx = btns.length - 1;
    modalIndex = idx;
    highlightFocusedElement(btns[idx]);
  }

  function swapFavoriteCards(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= favorites.length) return;
    var temp = favorites[fromIndex];
    favorites[fromIndex] = favorites[toIndex];
    favorites[toIndex] = temp;
    appConfig.cards = favorites;
    saveConfigToLocal(appConfig);
    renderMainCards();
    focusZoneItem(1, toIndex);
  }

  function simulateRemoteAction(keyName) {
    var map = { left: 37, up: 38, right: 39, down: 40, ok: 13, back: 461 };
    var code = map[keyName];
    if (code) {
      handleKeyCode(code, { preventDefault: function () {} });
    }
  }

  function handleKeyCode(code, e) {
    if (code === 461 || code === 27 || code === 8) {
      e.preventDefault();
      if (isCastOpen) {
        stopCastPlayback();
      } else if (isModalOpen) {
        closeClassicModal();
      } else if (isEditingOrder) {
        toggleEditOrderMode();
      } else {
        openClassicModal();
      }
      return;
    }

    if (isCastOpen) {
      if (code === 13 || code === 32) {
        e.preventDefault();
        controlActiveCast("toggle_play");
      } else if (code === 37) {
        e.preventDefault();
        controlActiveCast("seek_rel", -15);
      } else if (code === 39) {
        e.preventDefault();
        controlActiveCast("seek_rel", 15);
      }
      return;
    }

    if (isModalOpen) {
      if (code === 38) {
        e.preventDefault();
        focusModalButton(modalIndex - 1);
      } else if (code === 40) {
        e.preventDefault();
        focusModalButton(modalIndex + 1);
      } else if (code === 13) {
        e.preventDefault();
        var btns = document.querySelectorAll(".focusable-modal");
        if (btns[modalIndex]) btns[modalIndex].click();
      }
      return;
    }

    if (code >= 49 && code <= 57) {
      var numIdx = code - 49;
      if (favorites[numIdx]) {
        focusZoneItem(1, numIdx);
        launchFavoriteItem(favorites[numIdx]);
      }
      return;
    }

    if (code === 37) {
      e.preventDefault();
      if (isEditingOrder && currentZone === 1) {
        swapFavoriteCards(zoneIndices[1], zoneIndices[1] - 1);
      } else {
        focusZoneItem(currentZone, zoneIndices[currentZone] - 1);
      }
    } else if (code === 39) {
      e.preventDefault();
      if (isEditingOrder && currentZone === 1) {
        swapFavoriteCards(zoneIndices[1], zoneIndices[1] + 1);
      } else {
        focusZoneItem(currentZone, zoneIndices[currentZone] + 1);
      }
    } else if (code === 38) {
      e.preventDefault();
      if (isEditingOrder) return;
      if (currentZone > 0) {
        focusZoneItem(currentZone - 1, zoneIndices[currentZone - 1]);
      }
    } else if (code === 40) {
      e.preventDefault();
      if (isEditingOrder) return;
      if (currentZone < 2) {
        focusZoneItem(currentZone + 1, zoneIndices[currentZone + 1]);
      }
    } else if (code === 13) {
      e.preventDefault();
      var items = getZoneElements(currentZone);
      if (items && items[zoneIndices[currentZone]]) {
        items[zoneIndices[currentZone]].click();
      }
    }
  }

  function setupRemoteKeyboardNavigation() {
    window.addEventListener("keydown", function (e) {
      var code = e.keyCode || e.which;
      handleKeyCode(code, e);
    });
  }

  var toastTimer = null;
  function showToast(text) {
    var toast = document.getElementById("toastMsg");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.add("hidden");
    }, 3400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
