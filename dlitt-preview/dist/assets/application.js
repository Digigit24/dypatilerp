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
  var ENABLED = CONFIG.applicationsEnabled === true;

  var form, submitBtn, statusEl, noticeEl;
  var submitting = false;

  document.addEventListener('DOMContentLoaded', function () {
    form = document.getElementById('dlitt-apply-form');
    submitBtn = document.getElementById('submit-application');
    statusEl = document.getElementById('form-status');
    noticeEl = document.getElementById('preview-notice');
    if (!form) return;

    if (!ENABLED) {
      // PREVIEW MODE: show the notice, keep Submit disabled, never submit.
      if (noticeEl) {
        noticeEl.textContent =
          'Online applications will open shortly. This form is currently available for preview only.';
        noticeEl.hidden = false;
      }
      if (submitBtn) submitBtn.disabled = true;
    } else if (submitBtn) {
      submitBtn.disabled = false;
    }

    // The submit handler is attached in both modes but is inert in preview
    // mode (belt-and-suspenders against an Enter-key submit).
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
    if (!ENABLED || submitting) return;      // preview mode never submits

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

  function validate() {
    var errs = [];
    if (!val('first_name')) errs.push('First name is required.');
    if (!val('last_name')) errs.push('Last name is required.');

    var email = val('email');
    if (!email) errs.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Enter a valid email address.');

    var mobile = val('mobile');
    if (mobile) {
      // Mobile is optional, but the applicants.phone column is VARCHAR(20),
      // so anything longer must be rejected client-side.
      if (mobile.length > 20) errs.push('Mobile number must be 20 characters or fewer.');
      else if (!/^[0-9+()\-\s]{4,20}$/.test(mobile)) errs.push('Enter a valid mobile number.');
    }

    var exp = val('experience_years');
    if (exp && (!/^\d{1,3}$/.test(exp) || Number(exp) < 0 || Number(exp) > 80)) {
      errs.push('Experience must be a whole number between 0 and 80.');
    }

    var consent = document.getElementById('consent');
    if (!consent || !consent.checked) errs.push('You must agree to the declaration to submit.');

    return errs;
  }

  function buildPayload() {
    var personal = {
      first_name: val('first_name'),
      last_name: val('last_name'),
      email: val('email').toLowerCase()
    };
    if (val('mobile')) personal.mobile = val('mobile');
    if (val('state_country')) personal.state_country = val('state_country');

    var academic = {};
    if (val('highest_degree')) academic.highest_degree = val('highest_degree');
    if (val('university')) academic.university = val('university');
    if (val('specialization')) academic.specialization = val('specialization');

    var professional = {};
    if (val('current_position')) professional.current_position = val('current_position');
    if (val('organization')) professional.organization = val('organization');
    if (val('experience_years')) professional.experience_years = Number(val('experience_years'));

    var applicant = { personal: personal };
    if (Object.keys(academic).length) applicant.academic = academic;         // omit empty object
    if (Object.keys(professional).length) applicant.professional = professional;
    if (val('research_statement')) applicant.research_statement = val('research_statement');
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
