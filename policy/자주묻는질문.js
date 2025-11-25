const defaultConfig = {
      page_title: "자주 묻는 질문",
      page_subtitle: "고객님들이 자주 문의하시는 내용입니다",
      primary_color: "#667eea",
      secondary_color: "#764ba2",
      background_color: "#ffffff",
      text_color: "#1f2937",
      accent_color: "#f9fafb",
      font_family: "Noto Sans KR",
      font_size: 16
    };

    async function onConfigChange(config) {
      const pageTitle = document.getElementById('page-title');
      const pageSubtitle = document.getElementById('page-subtitle');

      if (pageTitle) {
        pageTitle.textContent = config.page_title || defaultConfig.page_title;
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = config.page_subtitle || defaultConfig.page_subtitle;
      }

      const primaryColor = config.primary_color || defaultConfig.primary_color;
      const secondaryColor = config.secondary_color || defaultConfig.secondary_color;
      const backgroundColor = config.background_color || defaultConfig.background_color;
      const textColor = config.text_color || defaultConfig.text_color;
      const accentColor = config.accent_color || defaultConfig.accent_color;
      const fontFamily = config.font_family || defaultConfig.font_family;
      const fontSize = config.font_size || defaultConfig.font_size;

      document.body.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
      document.body.style.fontFamily = `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

      const header = document.querySelector('.header');
      if (header) {
        const h1 = header.querySelector('h1');
        const p = header.querySelector('p');
        if (h1) h1.style.fontSize = `${fontSize * 2.625}px`;
        if (p) p.style.fontSize = `${fontSize * 1.125}px`;
      }

      const faqContainer = document.querySelector('.faq-container');
      if (faqContainer) {
        faqContainer.style.background = backgroundColor;
      }

      const faqQuestions = document.querySelectorAll('.faq-question');
      faqQuestions.forEach(question => {
        question.style.color = textColor;
        question.style.fontSize = `${fontSize * 1.125}px`;
        const beforeStyle = window.getComputedStyle(question, '::before');
        question.style.setProperty('--primary-color', primaryColor);
        question.style.setProperty('--secondary-color', secondaryColor);
      });

      const style = document.createElement('style');
      style.textContent = `
        .faq-question::before {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%) !important;
        }
        .faq-question:hover {
          background: ${accentColor} !important;
          color: ${primaryColor} !important;
        }
        .faq-question::after {
          color: ${primaryColor} !important;
        }
        .faq-answer-content strong {
          color: ${primaryColor} !important;
        }
        .contact-section {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%) !important;
        }
        .contact-btn {
          color: ${primaryColor} !important;
        }
      `;
      const oldStyle = document.getElementById('dynamic-style');
      if (oldStyle) oldStyle.remove();
      style.id = 'dynamic-style';
      document.head.appendChild(style);

      const faqAnswers = document.querySelectorAll('.faq-answer-content');
      faqAnswers.forEach(answer => {
        answer.style.fontSize = `${fontSize}px`;
      });

      const contactSection = document.querySelector('.contact-section');
      if (contactSection) {
        const h3 = contactSection.querySelector('h3');
        const p = contactSection.querySelector('p');
        if (h3) h3.style.fontSize = `${fontSize * 1.375}px`;
        if (p) p.style.fontSize = `${fontSize}px`;
      }

      const contactBtns = document.querySelectorAll('.contact-btn');
      contactBtns.forEach(btn => {
        btn.style.fontSize = `${fontSize}px`;
      });
    }

    function mapToCapabilities(config) {
      return {
        recolorables: [
          {
            get: () => config.primary_color || defaultConfig.primary_color,
            set: (value) => {
              config.primary_color = value;
              window.elementSdk.setConfig({ primary_color: value });
            }
          },
          {
            get: () => config.secondary_color || defaultConfig.secondary_color,
            set: (value) => {
              config.secondary_color = value;
              window.elementSdk.setConfig({ secondary_color: value });
            }
          },
          {
            get: () => config.background_color || defaultConfig.background_color,
            set: (value) => {
              config.background_color = value;
              window.elementSdk.setConfig({ background_color: value });
            }
          },
          {
            get: () => config.text_color || defaultConfig.text_color,
            set: (value) => {
              config.text_color = value;
              window.elementSdk.setConfig({ text_color: value });
            }
          },
          {
            get: () => config.accent_color || defaultConfig.accent_color,
            set: (value) => {
              config.accent_color = value;
              window.elementSdk.setConfig({ accent_color: value });
            }
          }
        ],
        borderables: [],
        fontEditable: {
          get: () => config.font_family || defaultConfig.font_family,
          set: (value) => {
            config.font_family = value;
            window.elementSdk.setConfig({ font_family: value });
          }
        },
        fontSizeable: {
          get: () => config.font_size || defaultConfig.font_size,
          set: (value) => {
            config.font_size = value;
            window.elementSdk.setConfig({ font_size: value });
          }
        }
      };
    }

    function mapToEditPanelValues(config) {
      return new Map([
        ["page_title", config.page_title || defaultConfig.page_title],
        ["page_subtitle", config.page_subtitle || defaultConfig.page_subtitle],
      ]);
    }

    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
      });
    }

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
      question.addEventListener('click', function() {
        const answer = this.nextElementSibling;
        const isActive = this.classList.contains('active');
        
        document.querySelectorAll('.faq-question').forEach(q => {
          q.classList.remove('active');
        });
        document.querySelectorAll('.faq-answer').forEach(a => {
          a.classList.remove('active');
        });
        
        if (!isActive) {
          this.classList.add('active');
          answer.classList.add('active');
        }
      });
    });