/**
 * Main.js — Orchestrateur principal
 * Point d'entrée Web App, traitement webhook Telegram, triggers.
 */

var SUPPORT_BUILD = 'support-sprint2-debug-2026-05-05-1825';

// ============================
// WEB APP ENDPOINTS
// ============================

/**
 * Gère les requêtes GET (désinscription, status check).
 */
function doGet(e) {
  // En exécution manuelle depuis l'éditeur Apps Script, `e` est absent.
  if (!e || !e.parameter) {
    return HtmlService.createHtmlOutput(
      '<p>Bot Support Digital: endpoint Web App OK.</p>'
      + '<p><b>Note:</b> ne lancez pas <code>doGet</code> avec le bouton Exécuter.'
      + '</p><p>Utilisez une URL déployée avec des paramètres (<code>action=...</code>),'
      + ' ou testez avec la fonction <code>testBot()</code>.</p>'
    );
  }

  var action = e.parameter.action;

  // Endpoint désinscription
  if (action === 'unsubscribe' && e.parameter.token) {
    var html = handleUnsubscribe(e.parameter.token);
    return HtmlService.createHtmlOutput(html)
      .setTitle('Désinscription');
  }

  // Tracking pixel (email open)
  if (action === 'track_open' && e.parameter.cid && e.parameter.t) {
    return handleTrackOpen(e.parameter.cid, e.parameter.t);
  }

  // Tracked link click
  if (action === 'track_click' && e.parameter.cid && e.parameter.t && e.parameter.url) {
    return handleTrackClick(e.parameter.cid, e.parameter.t, e.parameter.url);
  }

  // Status check
  if (action === 'status' && validateWebhookKey(e)) {
    var provider = getActiveProvider();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: validateConfig().length === 0 ? 'complete' : 'incomplete',
      provider: provider.name,
      providerMode: provider.mode
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Version probe: verifies which deployed Web App code Telegram is hitting.
  if (action === 'version' && validateWebhookKey(e)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      build: SUPPORT_BUILD,
      debugSupport: isSupportDebugEnabled_(),
      webAppUrl: getWebAppUrl(),
      serviceUrl: ScriptApp.getService().getUrl(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Emergency switch to stop Telegram debug spam from browser.
  if (action === 'debug_off' && validateWebhookKey(e)) {
    PropertiesService.getScriptProperties().deleteProperty('DEBUG_SUPPORT');
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      debugSupport: false,
      message: 'DEBUG_SUPPORT disabled'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutput(
    '<p>Bot Support Digital actif.</p>'
    + '<p><b>Build:</b> ' + escapeHtml(SUPPORT_BUILD) + '</p>'
    + '<p><b>Debug support:</b> ' + (isSupportDebugEnabled_() ? 'ON' : 'OFF') + '</p>'
  );
}

/**
 * Gère les requêtes POST (webhook Telegram).
 */
function doPost(e) {
  try {
    if (e && e.postData && e.postData.contents && e.postData.contents.indexOf('/debug_off') !== -1) {
      PropertiesService.getScriptProperties().deleteProperty('DEBUG_SUPPORT');
    }

    if (typeof isSupportDebugEnabled_ === 'function' && isSupportDebugEnabled_()) {
      try {
        sendTelegramMessage('🧪 <b>DEBUG doPost HIT</b>\nBuild: ' + SUPPORT_BUILD);
      } catch (debugPostError) {
        console.log('[DEBUG_DOPOST_SEND_ERROR] ' + debugPostError.message);
      }
    }

    if (!e) {
      logEvent('WEBHOOK_ERROR', 'doPost called without event object (manual run?)');
      return ContentService.createTextOutput('Error');
    }

    // Vérifier la clé webhook
    if (!validateWebhookKey(e)) {
      logEvent('SECURITY', 'Invalid webhook key');
      return ContentService.createTextOutput('Unauthorized');
    }

    if (!e.postData || !e.postData.contents) {
      logEvent('WEBHOOK_ERROR', 'doPost missing postData');
      return ContentService.createTextOutput('Error');
    }

    var update = JSON.parse(e.postData.contents);
    if (isDuplicateTelegramUpdate_(update)) {
      logEvent('TELEGRAM_DUPLICATE', 'Skipped duplicate update_id=' + update.update_id);
      return ContentService.createTextOutput('OK');
    }

    // Vérifier que l'utilisateur est autorisé
    if (!isAuthorizedTelegramUser(update)) {
      var gotChatId = '';
      if (update.message && update.message.chat) {
        gotChatId = update.message.chat.id.toString();
      } else if (update.edited_message && update.edited_message.chat) {
        gotChatId = update.edited_message.chat.id.toString();
      } else if (update.callback_query && update.callback_query.message && update.callback_query.message.chat) {
        gotChatId = update.callback_query.message.chat.id.toString();
      }
      logEvent('SECURITY',
        'Telegram rejected: chat_id=' + gotChatId + '. Set TG_CHAT_ID to this exact value (same chat where you validate emails).');
      return ContentService.createTextOutput('OK');
    }

    // Traiter les commandes texte
    if (update.message && update.message.text) {
      handleTelegramCommand(update.message);
    } else if (update.edited_message && update.edited_message.text) {
      handleTelegramCommand(update.edited_message);
    }

    // Traiter les documents (upload PDF)
    if (update.message && update.message.document) {
      handleDocumentUpload(update.message);
    }

    // Traiter les callbacks (boutons)
    if (update.callback_query) {
      handleCallbackQuery_(update.callback_query);
    }

    return ContentService.createTextOutput('OK');
  } catch (e) {
    logEvent('WEBHOOK_ERROR', 'doPost failed: ' + e.message);
    return ContentService.createTextOutput('Error');
  }
}

function isDuplicateTelegramUpdate_(update) {
  if (!update || update.update_id === undefined || update.update_id === null) return false;

  var updateId = String(update.update_id);
  var store = PropertiesService.getScriptProperties();
  var key = 'tg_update_' + updateId;

  if (store.getProperty(key)) return true;

  store.setProperty(key, new Date().toISOString());
  cleanupTelegramUpdateMarkers_();
  return false;
}

function cleanupTelegramUpdateMarkers_() {
  var store = PropertiesService.getScriptProperties();
  var props = store.getProperties();
  var keys = Object.keys(props).filter(function (key) {
    return key.indexOf('tg_update_') === 0;
  });

  if (keys.length <= 80) return;

  keys.sort(function (a, b) {
    return String(props[a]).localeCompare(String(props[b]));
  });

  keys.slice(0, keys.length - 80).forEach(function (key) {
    store.deleteProperty(key);
  });
}

// ============================
// CALLBACK HANDLERS
// ============================

function handleCallbackQuery_(callbackQuery) {
  var data = callbackQuery.data;
  var messageId = callbackQuery.message.message_id;

  logEvent('CALLBACK_DEBUG', 'v2026-05-05-1755 callback received data=' + data + ' messageId=' + messageId);
  supportDebug_('callback received: data=' + data + ', messageId=' + messageId);
  answerCallbackQuery(callbackQuery.id);

  // --- Approve + PDF (doit être testé AVANT approve_ simple) ---
  if (data.indexOf('approve_pdf_') === 0) {
    var pdfApprovalToken = data.replace('approve_pdf_', '');
    var emailId = resolveSupportCallbackEmailId_(pdfApprovalToken);
    var pending = getPendingReply(emailId);
    if (!pending) {
      sendTelegramMessage('❌ Email non trouvé ou déjà traité. Le message original reste visible.');
      removeSupportCallbackToken_(pdfApprovalToken);
      return;
    }

    var pdfs = listProductPDFs();
    if (pdfs.length === 0) {
      sendTelegramMessage('⚠️ Aucun PDF dans le dossier produits.\nEnvoyez un PDF ici pour l\'ajouter.');
      return;
    }

    storePDFSelection(emailId, pdfs);
    sendTelegramMessage('📎 Sélection du PDF pour: ' + escapeHtml(pending.sender));
    sendPDFSelectionButtons(emailId, pdfs);
    removeSupportCallbackToken_(pdfApprovalToken);
  }

  // --- Support email actions ---
  else if (data.indexOf('approve_') === 0) {
    var approveToken = data.replace('approve_', '');
    var emailId = resolveSupportCallbackEmailId_(approveToken);
    var success = sendApprovedReply(emailId);
    if (success) {
      sendTelegramMessage('✅ Réponse envoyée avec succès.\n\nLe message original reste visible comme historique.');
      incrementStat('approved');
      removeSupportCallbackToken_(approveToken);
      incrementStat('processed');
    } else {
      sendTelegramMessage('❌ Erreur lors de l\'envoi.\n\nLe message original reste utilisable pour réessayer.');
      incrementStat('errors');
    }
  }

  else if (data.indexOf('draft_') === 0) {
    var draftToken = data.replace('draft_', '');
    logEvent('CALLBACK_DEBUG', 'draft clicked token=' + draftToken);
    supportDebug_('Draft clicked. token=' + draftToken);
    var emailId = resolveSupportCallbackEmailId_(draftToken);
    logEvent('CALLBACK_DEBUG', 'draft resolved emailId=' + emailId);
    supportDebug_('Draft token resolved. emailId=' + emailId);
    var success = createDraftReply(emailId, { completePending: true });
    logEvent('CALLBACK_DEBUG', 'draft createDraftReply success=' + success);
    supportDebug_('createDraftReply returned success=' + success);
    if (success) {
      var draftInfo = getLastSupportActionInfo_();
      logEvent('CALLBACK_DEBUG', 'draft info threadUrl=' + (draftInfo.threadUrl || '[empty]'));
      supportDebug_('Draft info: threadUrl=' + (draftInfo.threadUrl || '[empty]'));
      sendTelegramMessage(
        '✏️ <b>Brouillon créé dans Gmail</b>\n\n'
        + 'Où écrire/modifier: Gmail → Brouillons.\n'
        + (draftInfo.threadUrl ? 'Lien conversation: <a href="' + escapeHtml(draftInfo.threadUrl) + '">ouvrir dans Gmail</a>\n' : '')
        + '\nLe thread est marqué traité. Le brouillon reste modifiable dans Gmail.'
      );
      incrementStat('drafted');
      incrementStat('processed');
      removeSupportCallbackToken_(draftToken);
    } else {
      var draftError = getLastSupportActionError_();
      sendTelegramMessage(
        '❌ Erreur lors de la création du brouillon'
        + (draftError ? '\n\nCause: ' + escapeHtml(draftError) : '')
        + '\n\nLe message original reste utilisable pour essayer un autre bouton.'
      );
      incrementStat('errors');
    }
  }

  else if (data.indexOf('ignore_') === 0) {
    var ignoreToken = data.replace('ignore_', '');
    var emailId = resolveSupportCallbackEmailId_(ignoreToken);
    var success = ignoreEmail(emailId);
    if (success) {
      sendTelegramMessage('🗑 Email ignoré.\n\nLe message original reste visible comme historique.');
      incrementStat('ignored');
      removeSupportCallbackToken_(ignoreToken);
      incrementStat('processed');
    } else {
      sendTelegramMessage('❌ Email non trouvé ou déjà traité.\n\nLe message original reste visible.');
      incrementStat('errors');
    }
  }

  else if (data.indexOf('edit_') === 0) {
    var editToken = data.replace('edit_', '');
    var emailId = resolveSupportCallbackEmailId_(editToken);
    var pending = getPendingReply(emailId);
    if (pending && createDraftReply(emailId)) {
      var editInfo = getLastSupportActionInfo_();
      sendTelegramMessage(
        '✏️ <b>Mode édition</b>\n\n'
        + 'Un brouillon a été créé dans Gmail.\n'
        + 'Où écrire/modifier: Gmail → Brouillons.\n'
        + (editInfo.threadUrl ? 'Lien conversation: <a href="' + escapeHtml(editInfo.threadUrl) + '">ouvrir dans Gmail</a>\n' : '')
        + '\nDe: ' + escapeHtml(pending.sender)
        + '\n\nLe message Telegram original reste visible.'
      );
      incrementStat('drafted');
    } else {
      var editError = getLastSupportActionError_();
      sendTelegramMessage(
        '❌ Impossible de créer le brouillon édition'
        + (editError ? '\n\nCause: ' + escapeHtml(editError) : '\n\nCause: Email non trouvé ou déjà traité')
        + '\n\nLe message original reste visible.'
      );
      incrementStat('errors');
    }
  }

  // --- Envoi réponse + PDF sélectionné ---
  else if (data.indexOf('send_pdf_') === 0) {
    var parts = data.replace('send_pdf_', '').split('_');
    var pdfIndex = parseInt(parts[0], 10);
    var pdfToken = parts.slice(1).join('_');
    var emailId = resolveSupportCallbackEmailId_(pdfToken);

    var pdfList = getPDFSelection(emailId);
    if (!pdfList || pdfIndex >= pdfList.length) {
      sendTelegramMessage('❌ Sélection PDF expirée. Réessayez.');
      removeSupportCallbackToken_(pdfToken);
      return;
    }

    var selectedPdf = pdfList[pdfIndex];
    sendTelegramMessage('🚀 Envoi avec PDF "' + escapeHtml(selectedPdf.name) + '"...');

    var success = sendApprovedReplyWithPDF(emailId, selectedPdf.id);
    if (success) {
      sendTelegramMessage('✅ Réponse envoyée avec 📄 ' + escapeHtml(selectedPdf.name));
      incrementStat('approved');
      removePDFSelection(emailId);
      removeSupportCallbackToken_(pdfToken);
      incrementStat('processed');
    } else {
      sendTelegramMessage('❌ Erreur lors de l\'envoi avec PDF');
      incrementStat('errors');
    }
  }

  // --- Annulation sélection PDF ---
  else if (data.indexOf('cancel_pdf_') === 0) {
    var cancelPdfToken = data.replace('cancel_pdf_', '');
    var emailId = resolveSupportCallbackEmailId_(cancelPdfToken);
    removePDFSelection(emailId);
    removeSupportCallbackToken_(cancelPdfToken);
    sendTelegramMessage('❌ Sélection PDF annulée. L\'email reste en attente.');
  }

  // --- Campaign actions ---
  else if (data.indexOf('campaign_send_') === 0) {
    var campaignId = data.replace('campaign_send_', '');
    updateTelegramMessage(messageId, '🚀 Lancement de la campagne...');
    executeCampaign(campaignId);
    incrementStat('campaignsSent');
  }

  else if (data.indexOf('campaign_cancel_') === 0) {
    var campaignId = data.replace('campaign_cancel_', '');
    cancelCampaign(campaignId);
    updateTelegramMessage(messageId, '❌ Campagne annulée');
  }

  // --- Dashboard actions ---
  else if (data.indexOf('dash_') === 0) {
    handleDashboardCallback(data, messageId);
  }
}

// ============================
// TRIGGERS SETUP
// ============================

/**
 * Configure tous les triggers nécessaires.
 * À exécuter une seule fois manuellement.
 */
function setupTriggers() {
  // Supprimer les triggers existants
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  // Scan inbox toutes les 1 minute
  ScriptApp.newTrigger('scanInbox')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Rapport quotidien à 9h
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  // Rapport hebdomadaire le lundi à 9h
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  // Backup hebdomadaire le dimanche à 2h
  ScriptApp.newTrigger('backupMarketingData')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(2)
    .create();

  // Sync Shopify clients tous les jours à 6h
  ScriptApp.newTrigger('syncShopifyCustomers')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // Nettoyage quotidien des logs à 3h du matin
  ScriptApp.newTrigger('cleanupOldLogs')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();

  // Vérification intégrité mensuelle (1er du mois à 4h)
  ScriptApp.newTrigger('autoFixIntegrity')
    .timeBased()
    .onMonthDay(1)
    .atHour(4)
    .create();

  logEvent('SETUP', 'All triggers configured (7 total)');
  sendTelegramMessage(
    '\u2705 <b>Bot configur\u00e9</b>\n\n'
    + 'Triggers install\u00e9s:\n'
    + '- Scan inbox: toutes les 1 min\n'
    + '- Rapport quotidien: 9h\n'
    + '- Rapport hebdo: lundi 9h\n'
    + '- Sync Shopify: 6h quotidien\n'
    + '- Backup: dimanche 2h\n'
    + '- Nettoyage logs: 3h\n'
    + '- Int\u00e9grit\u00e9: 1er du mois 4h'
  );
}

/**
 * Initialisation complète du bot.
 * À exécuter une fois après déploiement.
 */
function initialize() {
  // Valider la configuration
  var missing = validateConfig();
  if (missing.length > 0) {
    console.log('Missing config: ' + missing.join(', '));
    throw new Error('Configuration incomplète. Propriétés manquantes: ' + missing.join(', '));
  }
  
  // Créer les labels Gmail
  ensureLabelsExist_();

  // Configurer les triggers
  setupTriggers();
  
  // Configurer le webhook Telegram (never /dev — Telegram gets 401)
  assertWebAppReadyForTelegramWebhook_();
  var webhookUrl = getWebAppUrl() + '?key=' + CONFIG.WEBHOOK_KEY;
  var setWebhookUrl = CONFIG.TG_API() + '/setWebhook?url=' + encodeURIComponent(webhookUrl);
  var response = UrlFetchApp.fetch(setWebhookUrl);
  var result = JSON.parse(response.getContentText());

  if (result.ok) {
    logEvent('SETUP', 'Telegram webhook configured');
    sendTelegramMessage(
      '\uD83E\uDD16 <b>Bot Support Digital initialisé !</b>\n\n'
      + '\u2705 Configuration validée\n'
      + '\u2705 Labels Gmail créés\n'
      + '\u2705 Triggers installés\n'
      + '\u2705 Webhook Telegram configuré\n\n'
      + 'Tapez /help pour les commandes disponibles.'
    );
  } else {
    throw new Error('Webhook setup failed: ' + result.description);
  }
}

// ============================
// UTILITAIRES DE TEST
// ============================

/**
 * Test rapide pour vérifier que le bot fonctionne.
 */
function testBot() {
  sendTelegramMessage('\uD83E\uDD16 Test: Le bot fonctionne correctement !');
}

/**
 * Test du scan inbox (dry run).
 */
function testScan() {
  var threads = GmailApp.search('is:inbox newer_than:1d', 0, 5);
  sendTelegramMessage(
    '\uD83D\uDD0D <b>Test Scan</b>\n\n'
    + 'Emails trouvés: ' + threads.length + '\n'
    + (threads.length > 0 ? 'Premier: ' + escapeHtml(threads[0].getFirstMessageSubject()) : 'Aucun email récent')
  );
}
function debugWebAppUrl() {
  console.log('CONFIG.WEB_APP_URL=' + CONFIG.WEB_APP_URL);
  console.log('ScriptApp.getService().getUrl()=' + ScriptApp.getService().getUrl());
  console.log('getWebAppUrl()=' + getWebAppUrl());
}
