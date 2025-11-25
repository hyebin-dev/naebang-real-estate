const defaultConfig = {
      main_title: "첫 집 구매, 어떻게 시작해야 할까요?",
      subtitle: "처음 집을 사려고 하는데 어디서부터 시작해야 할지 모르겠어요.",
      intro_text: "단계별로 따라하면 첫 집 구매가 어렵지 않습니다. 각 단계를 클릭해서 자세한 내용을 확인하세요!",
      background_color: "#192A56",
      card_color: "#ffffff",
      text_color: "#2d3748",
      accent_color: "#667eea",
      font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      font_size: 16
    };

    async function onConfigChange(config) {
      const mainTitle = document.getElementById('mainTitle');
      const subtitle = document.getElementById('subtitle');
      const introText = document.getElementById('introText');

      if (mainTitle) mainTitle.textContent = config.main_title || defaultConfig.main_title;
      if (subtitle) subtitle.textContent = config.subtitle || defaultConfig.subtitle;
      if (introText) introText.textContent = config.intro_text || defaultConfig.intro_text;

      const backgroundColor = config.background_color || defaultConfig.background_color;
      const cardColor = config.card_color || defaultConfig.card_color;
      const textColor = config.text_color || defaultConfig.text_color;
      const accentColor = config.accent_color || defaultConfig.accent_color;
      const fontFamily = config.font_family || defaultConfig.font_family;
      const fontSize = config.font_size || defaultConfig.font_size;

      document.body.style.background = `linear-gradient(135deg, ${backgroundColor} 0%, #192A56 100%)`;
      document.body.style.fontFamily = `${fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

      document.querySelectorAll('.step-card').forEach(card => { card.style.background = cardColor; });
      document.querySelectorAll('.step-title').forEach(title => { title.style.color = textColor; title.style.fontSize = `${fontSize * 1.5}px`; });
      document.querySelectorAll('.step-description').forEach(desc => { desc.style.fontSize = `${fontSize * 0.9375}px`; });

      document.querySelectorAll('.step-number').forEach(num => {
        num.style.background = `color: #192A56`;
        num.style.fontSize = `${fontSize * 1.5}px`;
      });

      document.querySelectorAll('.expand-icon').forEach(icon => {
        icon.style.color = accentColor;
        icon.style.fontSize = `${fontSize * 1.5}px`;
      });

      document.querySelectorAll('.checklist-title').forEach(t => t.style.fontSize = `${fontSize}px`);
      document.querySelectorAll('.checklist-item').forEach(i => i.style.fontSize = `${fontSize * 0.875}px`);
      document.querySelectorAll('.tip-title').forEach(t => { t.style.fontSize = `${fontSize * 0.875}px`; t.style.color = accentColor; });
      document.querySelectorAll('.tip-text').forEach(t => t.style.fontSize = `${fontSize * 0.875}px`);
      document.querySelectorAll('.tip-box').forEach(b => b.style.borderLeftColor = accentColor);

      if (mainTitle) mainTitle.style.fontSize = `${fontSize * 3}px`;
      if (subtitle) subtitle.style.fontSize = `${fontSize * 1.25}px`;
      if (introText) introText.style.fontSize = `${fontSize}px`;
    }

    function mapToCapabilities(config) {
      return {
        recolorables: [
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              config.background_color = value;
              if (window.elementSdk) window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.card_color || defaultConfig.card_color,
            set: (value) => {
              config.card_color = value;
              if (window.elementSdk) window.elementSdk.setConfig({ card_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              config.text_color = value;
              if (window.elementSdk) window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.accent_color || defaultConfig.accent_color,
            set: (value) => {
              config.accent_color = value;
              if (window.elementSdk) window.elementSdk.setConfig({ accent_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: {
          get: () => config.font_family || defaultConfig.font_family,
          set: (value) => {
            config.font_family = value;
            if (window.elementSdk) window.elementSdk.setConfig({ font_family: value });
          }
        },
        fontSizeable: {
          get: () => config.font_size || defaultConfig.font_size,
          set: (value) => {
            config.font_size = value;
            if (window.elementSdk) window.elementSdk.setConfig({ font_size: value });
          }
        }
      };
    }

    function mapToEditPanelValues(config) {
      return new Map([
        ["main_title", config.main_title || defaultConfig.main_title],
        ["subtitle", config.subtitle || defaultConfig.subtitle],
        ["intro_text", config.intro_text || defaultConfig.intro_text]
      ]);
    }

    // 스텝 카드 확장/축소 동작 (간단)
    document.querySelectorAll('.step-card').forEach(card => {
      card.addEventListener('click', function(e) {
        // 클릭한 요소가 내부의 링크나 버튼이면 무시하도록 (없음) - 기본은 전체 카드 토글
        this.classList.toggle('expanded');
      });
    });

    // elementSdk 초기화(있을 경우)
    if (window.elementSdk && typeof window.elementSdk.init === 'function') {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    } else {
      // SDK 없을 때 기본 적용
      onConfigChange(defaultConfig);
    }