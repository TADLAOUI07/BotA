# Sprint 2 - Stabilisation support Gmail + Telegram

Statut: code termine, validation Apps Script finale requise

## But du sprint

Rendre le support semi-automatique fiable avant d'evoluer sur Shopify/CRM et marketing.

## Travail deja merge dans le code

### 1. Spam: ne plus proposer une reponse "normale"

Fichier: `Gmail.js`

- Si `ruleResult.action === 'flag_spam'`, on ne passe plus par `generateReply()`.
- Une reponse figee d'avertissement est proposee, orientee "ne pas repondre automatiquement".

### 2. Envoi approuve: utiliser le provider unifie

Fichier: `Gmail.js`

- `sendApprovedReply()` utilise `sendSupportReply()` au lieu de `message.reply()` direct.
- Objectif: permettre le fallback SendGrid si Gmail quota epuise selon `EmailProvider.js`.

### 3. Nettoyage pending expires

Fichier: `Gmail.js`

- `cleanupStalePendingReplies_()` supprime les entrees `pending_*` plus vieilles que 7 jours.
- Tente de retirer `DD_BOT_PENDING` et appliquer `DD_BOT_ERROR` sur le thread si `threadId` est connu.
- Appele au debut de `scanInbox()` pour ne pas dependre d'un nouveau trigger.

### 4. Webhook et commandes Telegram plus robustes

Fichiers: `Config.js`, `Security.js`, `Main.js`, `Telegram.js`

- Ajout de `WEB_APP_URL` pour forcer l'URL Apps Script de production se terminant par `/exec`.
- Refus explicite des URLs `/dev` pour le webhook Telegram, car Google renvoie `401 Unauthorized` a Telegram.
- Normalisation des commandes du type `/help@NomDuBot` vers `/help`.
- Logs plus utiles quand `TG_CHAT_ID` ne correspond pas au chat qui envoie une commande.

### 5. Limite Telegram `callback_data`

Fichiers: `Telegram.js`, `Main.js`

- Les boutons support n'exposent plus directement l'ID Gmail dans `callback_data`.
- Ajout de tokens courts `support_cb_*` stockes dans Script Properties.
- Les anciens boutons contenant directement l'ID Gmail restent compatibles.
- Nettoyage automatique des tokens de callbacks expires.

### 6. Alignement `Rules.js` / `ReplyEngine.js`

Fichiers: `Rules.js`, `Gmail.js`

- `applyBusinessRules()` expose maintenant une `category` quand il delegue au moteur de reponse simple.
- `Gmail.js` reutilise cette categorie pour eviter des divergences entre action, regle appliquee et categorie affichee sur Telegram.

### 7. Actions Telegram plus explicites

Fichiers: `Gmail.js`, `Main.js`

- `ignoreEmail()` retourne maintenant un succes/echec.
- Les boutons `ignore` et `edit` affichent une erreur claire si l'email est deja traite ou introuvable.

## Tests effectues (local / statique)

- Verification statique: spam ne declenche plus `generateReply()` quand `action === 'flag_spam'`.
- Verification statique: `sendApprovedReply()` appelle `sendSupportReply()`.
- Verification statique: `scanInbox()` appelle `cleanupStalePendingReplies_()`.
- Verification statique: les callbacks support utilisent des tokens courts compatibles avec la limite Telegram de 64 octets.
- Verification statique: anciens boutons avec emailId direct restent resolvables.
- Verification statique: `initialize()` refuse explicitement une URL `/dev`.
- Verification lint/diagnostics: aucune erreur detectee sur les fichiers modifies.

## Tests Apps Script deja observes

- `testBot()` envoie bien un message Telegram.
- `initialize()` cree les labels Gmail et les triggers.
- `scanInbox` est execute par trigger horaire Apps Script.
- Un email reel arrive bien dans Telegram avec la proposition de reponse et les boutons.
- `getWebhookInfo` a identifie la cause du blocage commandes entrantes: webhook en `/dev` avec `401 Unauthorized`.

## Tests Apps Script requis pour fermer officiellement le sprint

- Configurer `WEB_APP_URL` avec l'URL Web App `/exec`, redeployer puis executer `initialize()`.
- Verifier `getWebhookInfo`: `url` doit finir par `/exec?key=...` et ne plus pointer vers `/dev`.
- Envoyer `/start`, `/help` et `/status` dans Telegram: chaque commande doit repondre.
- Scenario approval: bouton `Approve & Send` envoie bien une reponse Gmail et met le thread en `DD_BOT_DONE`.
- Scenario draft: bouton `Draft` cree bien un brouillon Gmail et met le thread en `DD_BOT_DONE`.
- Scenario ignore: bouton `Ignore` retire `DD_BOT_PENDING`, applique `DD_BOT_DONE` et supprime le pending.
- Scenario edit: bouton `Edit` cree un brouillon ou affiche une erreur claire si le pending n'existe plus.
- Scenario spam: email declenchant `flag_spam` doit proposer un message d'avertissement, pas une reponse client classique.
- Scenario pending expire: forcer un `pending_*` vieux de 8 jours et verifier cleanup + label `DD_BOT_ERROR`.
- Scenario quota: simuler epuisement Gmail et verifier fallback SendGrid si `SENDGRID_API_KEY` est configure.

## Gate de sprint

Le code du Sprint 2 est pret. Selon la Definition of Done du projet, le sprint ne doit etre marque `termine` qu'apres execution et documentation des tests Apps Script ci-dessus, en particulier le webhook `/exec` et les boutons Telegram sur un email reel.
