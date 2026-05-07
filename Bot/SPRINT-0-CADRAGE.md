# Sprint 0 - Audit, cadrage et environnement

Statut: termine

## But du sprint

Comprendre l'existant, figer la vision produit et preparer le projet pour un developpement par sprints sans oublier les fonctionnalites importantes.

## Vision produit validee

Le projet doit devenir un assistant e-commerce intelligent qui couvre:

- Support client Gmail avec validation Telegram.
- CRM Shopify propre et conforme.
- Campagnes emailing via Gmail/SendGrid.
- Analytics email, Shopify et business.
- Scan KPI Ads via MCP.
- Analyse IA des performances marketing.
- Generation IA de campagnes email avec design, copywriting et CTA.
- Validation humaine Telegram avant envoi.
- Optimisation continue Ads -> Email -> Shopify.

## Etat existant du projet

Modules deja presents:

- `Main.js`: endpoints Apps Script, webhook Telegram, callbacks, triggers, initialisation.
- `Config.js`: configuration via Script Properties.
- `Gmail.js`: scan inbox, labels, pending replies, envoi, brouillons, PDF.
- `Telegram.js`: commandes, messages, boutons, upload PDF.
- `ReplyEngine.js`: detection langue, categorisation, templates.
- `Rules.js`: regles Shopify, digital/physique, spam.
- `Shopify.js`: lookup commandes, sync clients.
- `Marketing.js`: contacts, campagnes, desinscription.
- `EmailProvider.js`: choix Gmail/SendGrid.
- `SendGrid.js`: envoi et stats SendGrid.
- `EmailTemplates.js`: templates HTML marketing.
- `Analytics.js`: tracking ouvertures/clics.
- `SheetSetup.js`: creation Sheets, logs, import/export/delete.
- `Logger.js`: logs et stats.
- `Dashboard.js`: rapports et dashboard Telegram.
- `Backup.js`: backups, retry, integrite.
- `appsscript.json`: scopes et configuration Apps Script.

## Comptes et services a connecter

Obligatoires pour le socle:

- Google Apps Script.
- Gmail du support.
- Telegram Bot.
- Google Sheets.

Fortement recommandes:

- Shopify Admin API.
- SendGrid.
- Google Drive pour PDFs produits.

Futurs modules:

- MCP Ads disponible selon plateforme.
- Fournisseur IA ou mecanisme d'appel IA a definir.

## Script Properties a documenter

Existantes ou prevues:

- `TG_TOKEN`
- `TG_CHAT_ID`
- `WEBHOOK_KEY`
- `WEB_APP_URL`
- `SUPPORT_EMAIL`
- `SHOPIFY_STORE`
- `SHOPIFY_TOKEN`
- `MARKETING_SHEET_ID`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM`
- `SENDGRID_FROM_NAME`
- `SENDGRID_PLAN`
- `EMAIL_PROVIDER`
- `PRODUCTS_FOLDER_ID`

A prevoir plus tard:

- Secret de signature tracking.
- Secret Telegram `secret_token` si implemente.
- Configuration MCP Ads.
- Configuration IA.

## Decisions de developpement

- Ne pas ajouter Ads MCP ou IA avant securite, CRM, consentement et emailing fiable.
- Garder validation humaine Telegram pour les actions sensibles.
- Ne pas envoyer de marketing sans consentement explicite.
- Utiliser SendGrid comme provider marketing principal une fois la phase emailing stabilisee.
- Eviter les donnees personnelles dans logs et URLs.
- Documenter les tests a chaque fin de sprint.

## Risques prioritaires identifies

- Web app Apps Script public avec execution comme compte deployeur.
- Fuite possible de `WEBHOOK_KEY` dans les logs actuels.
- Consentement Shopify actuellement trop permissif.
- Tracking email avec Base64 email, donc PII dans URL.
- Campagnes envoyees en un seul run, risque timeout Apps Script.
- Modules existants parfois non raccordes entre eux.

## Backlog priorise

1. Corriger secrets, logs et securite webhook.
2. Stabiliser support Gmail + Telegram.
3. Finaliser produits digitaux/PDF.
4. Nettoyer CRM Shopify et consentement.
5. Refaire emailing en queue batchee.
6. Securiser templates, tracking et RGPD.
7. Ajouter analytics business.
8. Integrer Ads MCP.
9. Ajouter AI Marketing Brain.
10. Ajouter AI Campaign Designer.
11. Ajouter boucle d'optimisation.
12. Tester, documenter et livrer.

## Tests de fin de Sprint 0

Type de sprint: documentation/cadrage.

Tests attendus:

- `ROADMAP.md` contient le plan global, les sprints et la Definition of Done.
- `project-roadmap.mdc` demande aux futurs agents de lire `Bot/ROADMAP.md`.
- Les fichiers de cadrage ne contiennent aucun secret.
- Les fichiers de cadrage passent la verification lint/diagnostics disponible.

Resultat:

- Valide: `ROADMAP.md` contient le plan global, les sprints et la Definition of Done avec tests obligatoires.
- Valide: `.cursor/rules/project-roadmap.mdc` demande aux futurs agents de lire `Bot/ROADMAP.md`.
- Valide: aucun secret n'a ete ajoute dans les fichiers de cadrage.
- Valide: aucune erreur de lint/diagnostic detectee sur `ROADMAP.md`, `SPRINT-0-CADRAGE.md` et `project-roadmap.mdc`.

## Livrable Sprint 0

- `ROADMAP.md` mis a jour avec plan par sprints et tests obligatoires.
- `SPRINT-0-CADRAGE.md` cree comme livrable de cadrage.
- Sprint 1 pret a demarrer: securite webhook, secrets et logs.
