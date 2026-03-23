(function () {
  'use strict';

  // ===== Constants =====
  var GAS_API_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
  var GAS_FORM_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
  var FALLBACK_DATA = {
    company_name: '御社',
    area: '',
    job_type: '人材採用'
  };
  var FETCH_TIMEOUT_MS = 8000;

  // ===== DOM Elements =====
  var loadingEl = document.getElementById('loading');
  var errorViewEl = document.getElementById('errorView');
  var mainContentEl = document.getElementById('mainContent');
  var companyNameHeroEl = document.getElementById('companyNameHero');
  var areaHeroEl = document.getElementById('areaHero');
  var jobTypeHeroEl = document.getElementById('jobTypeHero');

  // ===== URL Parameter =====
  var params = new URLSearchParams(window.location.search);
  var leadId = params.get('id');

  // ===== Utility: Sanitize text to prevent XSS =====
  function sanitize(text) {
    if (typeof text !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ===== Utility: Fetch with timeout =====
  function fetchWithTimeout(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function () {
        controller.abort();
        reject(new Error('Request timeout'));
      }, timeoutMs);

      fetch(url, { signal: controller.signal })
        .then(function (response) {
          clearTimeout(timer);
          resolve(response);
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // ===== Show/Hide Views =====
  function showLoading() {
    loadingEl.classList.remove('hidden');
    errorViewEl.classList.add('hidden');
    mainContentEl.classList.add('hidden');
  }

  function showError() {
    loadingEl.classList.add('hidden');
    errorViewEl.classList.remove('hidden');
    mainContentEl.classList.add('hidden');
  }

  function showMain() {
    loadingEl.classList.add('hidden');
    errorViewEl.classList.add('hidden');
    mainContentEl.classList.remove('hidden');
  }

  // ===== Apply Data to DOM =====
  function applyData(data) {
    var companyName = sanitize(data.company_name || FALLBACK_DATA.company_name);
    var area = sanitize(data.area || FALLBACK_DATA.area);
    var jobType = sanitize(data.job_type || FALLBACK_DATA.job_type);

    companyNameHeroEl.textContent = companyName;
    areaHeroEl.textContent = area;
    jobTypeHeroEl.textContent = jobType;

    // Update page title
    document.title = companyName + '様 - 採用枠のご案内 | FOCUS45°';

    // Set hidden form fields
    document.getElementById('formLeadId').value = leadId || '';
    document.getElementById('formLeadCompany').value = companyName;
    document.getElementById('formLeadArea').value = area;
    document.getElementById('formLeadJobType').value = jobType;
  }

  // ===== Fetch Lead Data from GAS =====
  function fetchLeadData() {
    if (!leadId || leadId.trim() === '') {
      showError();
      return;
    }

    showLoading();

    var apiUrl = GAS_API_URL + '?id=' + encodeURIComponent(leadId);

    fetchWithTimeout(apiUrl, FETCH_TIMEOUT_MS)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('API returned status ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        if (!data || !data.company_name) {
          throw new Error('Invalid data: company_name is missing');
        }
        applyData(data);
        showMain();
      })
      .catch(function (err) {
        console.error('Failed to fetch lead data:', err);
        showError();
      });
  }

  // ===== Form Validation & Submission =====
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFieldError(id, shouldShow) {
    var el = document.getElementById(id);
    if (shouldShow) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function initForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var company = document.getElementById('formCompany').value.trim();
      var name = document.getElementById('formName').value.trim();
      var phone = document.getElementById('formPhone').value.trim();
      var email = document.getElementById('formEmail').value.trim();

      // Validate
      var hasError = false;

      showFieldError('companyError', !company);
      if (!company) hasError = true;

      showFieldError('nameError', !name);
      if (!name) hasError = true;

      showFieldError('phoneError', !phone);
      if (!phone) hasError = true;

      var emailInvalid = !email || !validateEmail(email);
      showFieldError('emailError', emailInvalid);
      if (emailInvalid) hasError = true;

      if (hasError) return;

      var submitBtn = document.getElementById('submitBtn');
      var formMessage = document.getElementById('formMessage');

      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      var formData = {
        company: company,
        name: name,
        phone: phone,
        email: email,
        lead_id: document.getElementById('formLeadId').value,
        lead_company: document.getElementById('formLeadCompany').value,
        lead_area: document.getElementById('formLeadArea').value,
        lead_job_type: document.getElementById('formLeadJobType').value,
        source: 'personalized_lp',
        submitted_at: new Date().toISOString()
      };

      fetch(GAS_FORM_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
        .then(function () {
          formMessage.className = 'rounded-lg p-4 text-center font-bold form-message-success';
          formMessage.textContent = 'お申し込みありがとうございます。担当者より2営業日以内にご連絡いたします。';
          formMessage.classList.remove('hidden');

          form.reset();
          submitBtn.textContent = '送信完了';
        })
        .catch(function () {
          formMessage.className = 'rounded-lg p-4 text-center font-bold form-message-error';
          formMessage.textContent = '送信に失敗しました。お手数ですが、お電話（03-6848-0217）にてお問い合わせください。';
          formMessage.classList.remove('hidden');

          submitBtn.disabled = false;
          submitBtn.textContent = '無料で資料を受け取る';
        });
    });
  }

  // ===== Smooth Scroll =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ===== Initialize =====
  function init() {
    fetchLeadData();
    initForm();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
