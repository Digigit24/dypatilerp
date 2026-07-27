/*
 * DLitt public application — form logic.
 *
 * Security posture:
 *  - No secrets, DB IDs, tokens, or passwords anywhere.
 *  - No localStorage / sessionStorage / cookies / query-string storage.
 *  - No applicant data logged to the console.
 *  - Dynamic messages use textContent only (never innerHTML) — backend
 *    messages are never injected as HTML.
 *  - No automatic retry of a failed POST. Double-submit is prevented.
 *  - The browser only ever sends { program, applicant }. It NEVER sends
 *    course_id, batch_id, status, role, password, user_id, credentials,
 *    or permissions. The backend is authoritative.
 */
(function () {
  'use strict';

  var CONFIG = window.DLITT_CONFIG || {};
  var API_URL = CONFIG.apiUrl || '';

  var form, submitBtn, statusEl;
  var submitting = false;

  document.addEventListener('DOMContentLoaded', function () {
    form = document.getElementById('dlitt-apply-form');
    submitBtn = document.getElementById('submit-application');
    statusEl = document.getElementById('form-status');
    if (!form) return;

    // The form is a real application form: Submit is active on load and is
    // disabled only while a request is in flight. Whether applications are
    // actually open is decided by the backend (a disabled/missing target
    // returns 503, handled below).
    form.addEventListener('submit', onSubmit);
  });

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';        // textContent — never innerHTML
    statusEl.className = 'form-status' + (kind ? ' form-status--' + kind : '');
    statusEl.hidden = !msg;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;                  // prevent double submission

    var errors = validate();
    if (errors.length) {
      setStatus(errors.join(' '), 'error');
      return;
    }
    send(buildPayload());
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
  }

  // Whole-number-in-range check. Rejects empty, non-numeric, decimals,
  // negatives, and out-of-range values (returns false → an error is pushed).
  function isIntInRange(raw, min, max) {
    if (!/^-?\d+$/.test(raw)) return false; // integers only — no decimals/strings/blank
    var n = Number(raw);
    return Number.isInteger(n) && n >= min && n <= max;
  }

  function validate() {
    var errs = [];
    // ── Required fields ──────────────────────────────────────────────────────
    if (!val('first_name')) errs.push('First Name is required.');
    if (!val('last_name')) errs.push('Last Name is required.');

    var email = val('email');
    if (!email) errs.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Enter a valid email address.');

    // WhatsApp Number — required. Column is VARCHAR(20), so cap at 20.
    var mobile = val('mobile');
    if (!mobile) errs.push('WhatsApp Number is required.');
    else if (mobile.length > 20) errs.push('WhatsApp Number must be 20 characters or fewer.');
    else if (!/^[0-9+()\-\s]{4,20}$/.test(mobile)) errs.push('Enter a valid WhatsApp Number.');

    var consent = document.getElementById('consent');
    if (!consent || !consent.checked) errs.push('You must agree to the declaration to submit.');

    // ── Optional fields — validated ONLY if filled ───────────────────────────
    var year = val('phd_completion_year');
    if (year && !isIntInRange(year, 1900, 2100)) errs.push('Enter a valid Year of PhD Completion (1900–2100).');

    var totalPubs = val('total_publications');
    if (totalPubs && !isIntInRange(totalPubs, 0, 1000)) errs.push('Total Number of Publications must be a whole number between 0 and 1000.');

    var exp = val('experience_years');
    if (exp && !isIntInRange(exp, 0, 80)) errs.push('Total Experience must be a whole number between 0 and 80.');

    // Optional string fields have no minimum; their maxlength is enforced by the
    // inputs (and, defensively, the backend). Nothing to validate here when blank.

    return errs;
  }

  function buildPayload() {
    // Called only after validate() passes.
    var personal = {
      first_name: val('first_name'),
      last_name: val('last_name'),
      email: val('email').toLowerCase(),
      mobile: val('mobile')
    };

    // Academic: include only the optional keys that are filled; omit the whole
    // object if none are. Numeric fields are sent as real numbers (never NaN /
    // numeric strings — validate() guarantees they're valid integers if present).
    var academic = {};
    if (val('phd_completion_year')) academic.phd_completion_year = Number(val('phd_completion_year'));
    if (val('phd_research_title')) academic.phd_research_title = val('phd_research_title');
    if (val('university')) academic.university = val('university');
    if (val('total_publications')) academic.total_publications = Number(val('total_publications')); // NOT scopus_publications
    if (val('prospective_topic')) academic.prospective_topic = val('prospective_topic');

    // Professional: only experience_years; omit the object if blank.
    var professional = {};
    if (val('experience_years')) professional.experience_years = Number(val('experience_years'));

    var applicant = { personal: personal };
    if (Object.keys(academic).length) applicant.academic = academic;         // omit empty academic
    if (Object.keys(professional).length) applicant.professional = professional; // omit empty professional
    if (val('research_statement')) applicant.research_statement = val('research_statement'); // omit if blank
    applicant.consent = true;

    return { program: 'dlitt', applicant: applicant };
  }

  function send(payload) {
    submitting = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }
    setStatus('', null);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.status === 201) {
          // Confirmation is shown ONLY on an exact 201.
          window.location.href = '/confirmation/';
          return;
        }
        return res.json()
          .catch(function () { return null; })
          .then(function (data) { handleError(res.status, data); });
      })
      .catch(function () {
        handleError('network', null); // network failure → connection message, no retry
      });
  }

  function handleError(status, data) {
    var msg;
    switch (status) {
      case 'network': msg = 'Could not connect. Please check your internet connection and try again.'; break;
      case 400: msg = safeValidationMessage(data); break;
      case 409: msg = 'You have already submitted an application for this intake.'; break;
      case 413: msg = 'The application information is too large. Please shorten the entered details and try again.'; break;
      case 429: msg = 'Too many application attempts. Please try again later.'; break;
      case 503: msg = 'Applications are opening shortly. Please try again later.'; break;
      default:  msg = 'An unexpected error occurred. Please try again later.';
    }
    setStatus(msg, 'error');
    submitting = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application'; }
  }

  // Backend 400 shape: { success:false, message, errors:[{path,message}] }.
  // Only plain-string messages are surfaced, and only via textContent.
  function safeValidationMessage(data) {
    if (data && Array.isArray(data.errors) && data.errors.length) {
      var parts = data.errors.map(function (er) {
        return (er && typeof er.message === 'string') ? er.message : 'Invalid value';
      });
      return 'Please correct the following: ' + parts.join(' ');
    }
    return 'Please check the form and correct any invalid fields.';
  }
})();
