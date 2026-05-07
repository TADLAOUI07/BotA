/**
 * Gmail.js — Module de gestion Gmail
 * Scan inbox, gestion des labels, filtrage et envoi de réponses.
 */

/**
 * Scanne la boîte de réception pour les nouveaux emails de support.
 * Appelé par un trigger toutes les 1 minute.
 */
function scanInbox() {
  try {
    if (!checkRateLimit('scan_inbox', 5)) {
      logEvent('SCAN_THROTTLED', 'Inbox scan rate-limited');
      return;
    }

    ensureLabelsExist_();

    cleanupStalePendingReplies_();

    var query = 'is:inbox -label:' + CONFIG.LABELS.PENDING
      + ' -label:' + CONFIG.LABELS.DONE
      + ' -label:' + CONFIG.LABELS.ERROR
      + ' newer_than:1d';

    var threads = GmailApp.search(query, 0, CONFIG.MAX_THREADS_PER_SCAN);

    if (threads.length === 0) return;

    logEvent('SCAN', 'Found ' + threads.length + ' new thread(s)');

    var pendingLabel = GmailApp.getUserLabelByName(CONFIG.LABELS.PENDING);

    threads.forEach(function (thread) {
      try {
        var message = thread.getMessages()[thread.getMessageCount() - 1];
        processIncomingEmail_(message, thread, pendingLabel);
      } catch (e) {
        logEvent('SCAN_ERROR', 'Thread processing failed: ' + e.message);
        applyLabel_(thread, CONFIG.LABELS.ERROR);
      }
    });
  } catch (e) {
    logEvent('SCAN_CRITICAL', 'Inbox scan failed: ' + e.message);
    sendTelegramMessage('\u26A0\uFE0F <b>Erreur scan inbox</b>\n' + e.message);
  }
}

/**
 * Traite un email entrant.
 */
function processIncomingEmail_(message, thread, pendingLabel) {
  var sender = message.getFrom();
  var subject = message.getSubject();
  var body = message.getPlainBody();
  var emailId = message.getId();

  // Filtres de sécurité
  if (isIgnoredSender_(sender)) {
    logEvent('FILTERED', 'Ignored sender: ' + sender);
    applyLabel_(thread, CONFIG.LABELS.DONE);
    return;
  }

  if (isAutoReply_(message)) {
    logEvent('FILTERED', 'Auto-reply detected: ' + sender);
    applyLabel_(thread, CONFIG.LABELS.DONE);
    return;
  }

  // Détecter la langue
  var lang = detectLanguage(body);

  // Appliquer le moteur de règles métier (Shopify-aware)
  var ruleResult = applyBusinessRules(sender, subject, body, lang);

  // Fallback sur le moteur de réponse simple si pas de règle enrichie
  var replyText;
  var category;

  if (ruleResult.action === 'flag_spam') {
    replyText = lang === 'fr'
      ? '[SPAM] Email detecte comme spam par les regles metier. Ne pas repondre automatiquement. Verifier manuellement avant toute action.'
      : '[SPAM] This email was flagged as spam by business rules. Do not auto-reply. Review manually before any action.';
    category = ruleResult.category || 'spam';
  } else if (ruleResult.enrichedReply) {
    replyText = ruleResult.enrichedReply;
    category = ruleResult.category || ruleResult.ruleApplied;
  } else {
    var replyData = generateReply(sender, subject, body, lang);
    replyText = replyData.text;
    category = ruleResult.category || replyData.category;
  }

  // Analyser la sécurité de l'email
  var securityInfo = analyzeEmailSecurity(message);

  // Stocker la réponse en attente
  storePendingReply(emailId, {
    sender: sender,
    subject: subject,
    body: body,
    reply: replyText,
    lang: lang,
    category: category,
    action: ruleResult.action,
    threadId: thread.getId(),
    shopifyData: ruleResult.shopifyData,
    timestamp: new Date().toISOString()
  });

  // Envoyer sur Telegram pour validation
  var telegramText = '<b>\uD83D\uDCE8 Nouveau email support</b>\n\n'
    + '<b>De:</b> ' + escapeHtml(sender) + '\n'
    + '<b>Objet:</b> ' + escapeHtml(subject) + '\n'
    + '<b>Langue:</b> ' + lang + '\n'
    + '<b>Catégorie:</b> ' + category + '\n'
    + '<b>Action:</b> ' + ruleResult.action + '\n';

  // Ajouter info Shopify si disponible
  if (ruleResult.shopifyData) {
    telegramText += '<b>Commande:</b> ' + ruleResult.shopifyData.name
      + ' (' + ruleResult.shopifyData.status + ')\n';
  }

  // Alertes sécurité
  if (securityInfo.warnings.length > 0) {
    telegramText += '<b>\u26A0\uFE0F Sécurité:</b> ' + securityInfo.warnings.join(', ') + '\n';
  }

  telegramText += '\n<b>--- Message (extrait) ---</b>\n'
    + escapeHtml(body.substring(0, 300)) + (body.length > 300 ? '...' : '') + '\n\n'
    + '<b>--- Réponse proposée ---</b>\n'
    + escapeHtml(replyText);

  sendApprovalRequest(telegramText, emailId);

  // Marquer comme en cours
  thread.addLabel(pendingLabel);

  // Logger dans le Sheet aussi
  logToSheet('SUPPORT', sender, ruleResult.action, 'pending', category);

  logEvent('PROCESSED', 'Email from ' + sender + ' — category: ' + category + ' — rule: ' + ruleResult.ruleApplied);
}

/**
 * Envoie la réponse approuvée.
 * @param {string} emailId - ID du message Gmail
 * @returns {boolean} Succès
 */
function sendApprovedReply(emailId) {
  try {
    var pending = getPendingReply(emailId);
    if (!pending) {
      logEvent('SEND_ERROR', 'No pending reply for: ' + emailId);
      return false;
    }

    var message = GmailApp.getMessageById(emailId);
    if (!message) {
      logEvent('SEND_ERROR', 'Message not found: ' + emailId);
      return false;
    }

    var sent = sendSupportReply(message, pending.reply);
    if (!sent) {
      logEvent('SEND_ERROR', 'sendSupportReply failed for: ' + emailId);
      return false;
    }

    var thread = GmailApp.getThreadById(pending.threadId);
    removeLabel_(thread, CONFIG.LABELS.PENDING);
    applyLabel_(thread, CONFIG.LABELS.DONE);

    removePendingReply(emailId);
    logEvent('SENT', 'Reply sent to ' + pending.sender);
    return true;
  } catch (e) {
    logEvent('SEND_ERROR', 'Failed to send reply: ' + e.message);
    return false;
  }
}

/**
 * Crée un brouillon au lieu d'envoyer directement.
 * @param {string} emailId
 * @returns {boolean} Succès
 */
function createDraftReply(emailId) {
  try {
    logEvent('DRAFT_DEBUG', 'v2026-05-05-1755 start createDraftReply emailId=' + emailId);
    supportDebug_('createDraftReply start. emailId=' + emailId);
    clearLastSupportActionError_();
    clearLastSupportActionInfo_();

    var pending = getPendingReply(emailId);
    if (!pending) {
      setLastSupportActionError_('Email pending introuvable ou deja traite: ' + emailId);
      logEvent('DRAFT_ERROR', 'No pending reply for: ' + emailId);
      supportDebug_('ERROR: pending introuvable/deja traite for emailId=' + emailId);
      return false;
    }
    logEvent('DRAFT_DEBUG', 'pending found threadId=' + pending.threadId + ' subject=' + (pending.subject || ''));
    supportDebug_('Pending found. threadId=' + pending.threadId + ', subject=' + (pending.subject || ''));

    var message = GmailApp.getMessageById(emailId);
    if (!message) {
      setLastSupportActionError_('Message Gmail introuvable: ' + emailId);
      logEvent('DRAFT_ERROR', 'Message not found: ' + emailId);
      supportDebug_('ERROR: Gmail message introuvable for emailId=' + emailId);
      return false;
    }
    logEvent('DRAFT_DEBUG', 'Gmail message found. Creating draft now.');
    supportDebug_('Gmail message found. Creating draft now.');

    message.createDraftReply(pending.reply);
    logEvent('DRAFT_DEBUG', 'Draft created by GmailApp.createDraftReply.');
    supportDebug_('Draft created by GmailApp.createDraftReply.');

    var threadUrl = '';
    try {
      var thread = message.getThread();
      if (thread && thread.getPermalink) {
        threadUrl = thread.getPermalink();
      }
      logEvent('DRAFT_DEBUG', 'Thread permalink=' + (threadUrl || '[empty]'));
    } catch (linkError) {
      logEvent('DRAFT_LINK_WARNING', 'Draft created but thread link failed: ' + linkError.message);
    }

    setLastSupportActionInfo_(JSON.stringify({
      sender: pending.sender,
      subject: pending.subject,
      threadUrl: threadUrl
    }));
    logEvent('DRAFTED', 'Draft created for ' + pending.sender);
    logEvent('DRAFT_DEBUG', 'createDraftReply success. Pending kept for other buttons.');
    supportDebug_('createDraftReply success. Pending kept. Check Gmail > Brouillons.');
    return true;
  } catch (e) {
    setLastSupportActionError_('Erreur Gmail brouillon: ' + e.message);
    logEvent('DRAFT_ERROR', 'Failed to create draft: ' + e.message);
    supportDebug_('ERROR catch createDraftReply: ' + e.message);
    return false;
  }
}

/**
 * Ignore un email (le marque comme traité sans répondre).
 * @param {string} emailId
 * @returns {boolean} Succès
 */
function ignoreEmail(emailId) {
  var pending = getPendingReply(emailId);
  if (!pending) return false;

  try {
    var thread = GmailApp.getThreadById(pending.threadId);
    removeLabel_(thread, CONFIG.LABELS.PENDING);
    applyLabel_(thread, CONFIG.LABELS.DONE);
  } catch (e) {
    logEvent('IGNORE_ERROR', e.message);
    return false;
  }

  removePendingReply(emailId);
  logEvent('IGNORED', 'Email from ' + pending.sender + ' ignored');
  return true;
}

// ============================
// PRODUITS PDF (Google Drive)
// ============================

/**
 * Liste tous les fichiers PDF dans le dossier produits configuré.
 * @returns {Object[]} [{id, name, size}]
 */
function listProductPDFs() {
  if (!CONFIG.PRODUCTS_FOLDER_ID) return [];

  try {
    var folder = DriveApp.getFolderById(CONFIG.PRODUCTS_FOLDER_ID);
    var files = folder.getFilesByType(MimeType.PDF);
    var pdfs = [];

    while (files.hasNext()) {
      var file = files.next();
      pdfs.push({
        id: file.getId(),
        name: file.getName(),
        size: Math.round(file.getSize() / 1024)
      });
    }

    return pdfs;
  } catch (e) {
    logEvent('PDF_ERROR', 'Cannot list PDFs: ' + e.message);
    return [];
  }
}

/**
 * Envoie la réponse approuvée avec un fichier PDF en pièce jointe.
 * @param {string} emailId - ID du message Gmail
 * @param {string} fileId - ID du fichier Google Drive
 * @returns {boolean} Succès
 */
function sendApprovedReplyWithPDF(emailId, fileId) {
  try {
    var pending = getPendingReply(emailId);
    if (!pending) {
      logEvent('SEND_ERROR', 'No pending reply for: ' + emailId);
      return false;
    }

    var message = GmailApp.getMessageById(emailId);
    if (!message) {
      logEvent('SEND_ERROR', 'Message not found: ' + emailId);
      return false;
    }

    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();

    message.reply(pending.reply, {
      attachments: [blob]
    });

    var thread = GmailApp.getThreadById(pending.threadId);
    removeLabel_(thread, CONFIG.LABELS.PENDING);
    applyLabel_(thread, CONFIG.LABELS.DONE);

    removePendingReply(emailId);
    logEvent('SENT_WITH_PDF', 'Reply with PDF "' + file.getName() + '" sent to ' + pending.sender);
    return true;
  } catch (e) {
    logEvent('SEND_ERROR', 'Failed to send reply with PDF: ' + e.message);
    return false;
  }
}

/**
 * Stocke la liste des PDFs pour une sélection ultérieure via Telegram.
 * @param {string} emailId
 * @param {Object[]} pdfList
 */
function storePDFSelection(emailId, pdfList) {
  var store = PropertiesService.getScriptProperties();
  store.setProperty('pdf_select_' + emailId, JSON.stringify(pdfList));
}

/**
 * Récupère la liste des PDFs stockée pour un email.
 * @param {string} emailId
 * @returns {Object[]|null}
 */
function getPDFSelection(emailId) {
  var store = PropertiesService.getScriptProperties();
  var raw = store.getProperty('pdf_select_' + emailId);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Supprime la sélection PDF temporaire.
 * @param {string} emailId
 */
function removePDFSelection(emailId) {
  PropertiesService.getScriptProperties().deleteProperty('pdf_select_' + emailId);
}

// --- Labels ---

function ensureLabelsExist_() {
  var labelNames = Object.values(CONFIG.LABELS);
  labelNames.forEach(function (name) {
    if (!GmailApp.getUserLabelByName(name)) {
      GmailApp.createLabel(name);
      logEvent('LABEL_CREATED', name);
    }
  });
}

function applyLabel_(thread, labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (label) thread.addLabel(label);
}

function removeLabel_(thread, labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (label) thread.removeLabel(label);
}

// --- Filtres de sécurité ---

function isIgnoredSender_(sender) {
  var senderLower = sender.toLowerCase();
  return CONFIG.IGNORED_SENDERS.some(function (pattern) {
    return senderLower.indexOf(pattern) !== -1;
  });
}

function isAutoReply_(message) {
  var headers = message.getHeader('Auto-Submitted');
  if (headers && headers !== 'no') return true;

  var precedence = message.getHeader('Precedence');
  if (precedence && (precedence === 'bulk' || precedence === 'junk' || precedence === 'auto_reply')) return true;

  return false;
}

// --- Stockage temporaire (Script Properties) ---

function storePendingReply(emailId, data) {
  var store = PropertiesService.getScriptProperties();
  store.setProperty('pending_' + emailId, JSON.stringify(data));
}

function getPendingReply(emailId) {
  var store = PropertiesService.getScriptProperties();
  var raw = store.getProperty('pending_' + emailId);
  return raw ? JSON.parse(raw) : null;
}

function removePendingReply(emailId) {
  var store = PropertiesService.getScriptProperties();
  store.deleteProperty('pending_' + emailId);
}

function setLastSupportActionError_(message) {
  PropertiesService.getScriptProperties().setProperty('last_support_action_error', message);
}

function getLastSupportActionError_() {
  return PropertiesService.getScriptProperties().getProperty('last_support_action_error') || '';
}

function clearLastSupportActionError_() {
  PropertiesService.getScriptProperties().deleteProperty('last_support_action_error');
}

function setLastSupportActionInfo_(message) {
  PropertiesService.getScriptProperties().setProperty('last_support_action_info', message);
}

function getLastSupportActionInfo_() {
  var raw = PropertiesService.getScriptProperties().getProperty('last_support_action_info') || '';
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { message: raw };
  }
}

function clearLastSupportActionInfo_() {
  PropertiesService.getScriptProperties().deleteProperty('last_support_action_info');
}

function cleanupStalePendingReplies_() {
  var maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  var now = Date.now();
  var store = PropertiesService.getScriptProperties();
  var props = store.getProperties();
  var staleCount = 0;

  Object.keys(props).forEach(function (key) {
    if (key.indexOf('pending_') !== 0) return;

    var raw = props[key];
    var data = null;

    try {
      data = JSON.parse(raw);
    } catch (e) {
      store.deleteProperty(key);
      staleCount++;
      logEvent('PENDING_CLEANUP', 'Removed invalid pending payload for key: ' + key);
      return;
    }

    if (!data || !data.timestamp) return;

    var created = new Date(data.timestamp).getTime();
    if (isNaN(created)) return;

    if (now - created <= maxAgeMs) return;

    var emailId = key.replace('pending_', '');

    try {
      if (data.threadId) {
        var thread = GmailApp.getThreadById(data.threadId);
        removeLabel_(thread, CONFIG.LABELS.PENDING);
        applyLabel_(thread, CONFIG.LABELS.ERROR);
      }
    } catch (e) {
      logEvent('PENDING_CLEANUP_ERROR', 'Failed to cleanup thread for pending: ' + emailId + ' — ' + e.message);
    }

    removePendingReply(emailId);
    staleCount++;
    logEvent('PENDING_CLEANUP', 'Removed stale pending reply for emailId: ' + emailId);
  });

  if (staleCount > 0) {
    logEvent('PENDING_CLEANUP', 'Cleanup complete. Removed stale pending entries: ' + staleCount);
  }
}
